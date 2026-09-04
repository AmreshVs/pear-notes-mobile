import { AppState, AppStateStatus, Platform } from 'react-native'
import * as ExpoBackgroundService from 'expo-background-service'

import HRPC from '@pear-notes/core/spec/hrpc/index.js'
import {
  clearBackgroundServiceFailure,
  recordBackgroundServiceFailure,
} from '@pear-notes/core/utils.js'

import { getCachedBackgroundSyncMode } from '@/lib/backgroundSync'

const { setRPC } = require('@pear-notes/core/rpc.js')
const FramedStream = require('framed-stream')
const { Worklet } = require('react-native-bare-kit')

const BACKGROUND_LINGER_MS = 20_000
export const EXTENDED_BACKGROUND_WAKEUP_DEADLINE_MS = 5 * 60 * 1000
const KEEP_ALIVE_RENEWAL_MS = 60 * 1000

interface StartWorkletOptions {
  onWorkletDied?: () => void
  notificationTitle?: string
  notificationMessage?: string
}

let _activeWorklet: any = null
let _appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null
let _foregroundServiceActive = false
let _keepAliveTimer: ReturnType<typeof setInterval> | null = null
let _notificationStrings = { title: '', message: '' }

function logLifecycle(message: string, detail?: Record<string, unknown>) {
  const suffix = detail
    ? ' ' +
      Object.entries(detail)
        .map(([key, value]) => key + '=' + String(value))
        .join(' ')
    : ''
  console.log('[lifecycle] app ' + message + suffix)
}

function workletState(worklet: any) {
  return {
    started: worklet?.started,
    suspended: worklet?.suspended,
    terminated: worklet?.terminated,
  }
}

function stopKeepAlive() {
  if (!_keepAliveTimer) return
  clearInterval(_keepAliveTimer)
  _keepAliveTimer = null
}

function startKeepAlive(worklet: any) {
  stopKeepAlive()
  _keepAliveTimer = setInterval(() => {
    if (!worklet || worklet.terminated) {
      stopKeepAlive()
      return
    }
    try {
      worklet.wakeup(EXTENDED_BACKGROUND_WAKEUP_DEADLINE_MS)
    } catch {
      stopKeepAlive()
    }
  }, KEEP_ALIVE_RENEWAL_MS)
}

function handleBackground(worklet: any) {
  if (Platform.OS === 'android' && getCachedBackgroundSyncMode() === 'always-on') {
    try {
      ExpoBackgroundService.startService(
        _notificationStrings.title,
        _notificationStrings.message,
        0,
      )
      _foregroundServiceActive = true
      clearBackgroundServiceFailure()
      worklet.wakeup(EXTENDED_BACKGROUND_WAKEUP_DEADLINE_MS)
      startKeepAlive(worklet)
      return
    } catch (err) {
      _foregroundServiceActive = false
      console.error('Failed to start the background sync service', err)
      recordBackgroundServiceFailure()
    }
  }

  logLifecycle('background -> suspend', workletState(worklet))

  try {
    worklet.suspend(BACKGROUND_LINGER_MS)
    logLifecycle('background -> suspend returned', workletState(worklet))
  } catch (err) {
    console.error('[lifecycle] app failed to suspend the worklet', err)
  }
}

export function isForegroundServiceActive(): boolean {
  return _foregroundServiceActive
}

export function wakeActiveWorklet(deadlineMs: number): boolean {
  if (!_activeWorklet || _activeWorklet.terminated) return false
  try {
    _activeWorklet.wakeup(deadlineMs)
    return true
  } catch {
    return false
  }
}

export function isActiveWorkletSuspended(): boolean {
  return !!_activeWorklet && !_activeWorklet.terminated && _activeWorklet.suspended === true
}

export function suspendActiveWorklet(): boolean {
  if (!_activeWorklet || _activeWorklet.terminated) return false

  logLifecycle('background task -> re-suspend', workletState(_activeWorklet))

  try {
    _activeWorklet.suspend(0)
    return true
  } catch (err) {
    console.error('[lifecycle] app failed to re-suspend after the background task', err)
    return false
  }
}

function handleActive(worklet: any, onWorkletDied?: () => void) {
  stopKeepAlive()

  if (_foregroundServiceActive) {
    ExpoBackgroundService.stopService()
    _foregroundServiceActive = false
  }

  if (!worklet || worklet.terminated) {
    logLifecycle('active -> worklet is dead, restarting', workletState(worklet))
    onWorkletDied?.()
    return
  }

  logLifecycle('active -> resume', workletState(worklet))

  try {
    worklet.resume()
    logLifecycle('active -> resume returned', workletState(worklet))
  } catch (err) {
    console.error('[lifecycle] app failed to resume the worklet', err)
  }
}

function attachAppStateHandler(worklet: any, onWorkletDied?: () => void) {
  _appStateSubscription?.remove()

  _appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
    logLifecycle('AppState ' + state, workletState(worklet))

    if (state === 'active') {
      handleActive(worklet, onWorkletDied)
      return
    }

    if (!worklet || worklet.terminated) return

    if (state === 'background') {
      handleBackground(worklet)
    }
  })
}

export async function startWorklet(storagePath: string, options?: StartWorkletOptions) {
  stopKeepAlive()
  _appStateSubscription?.remove()
  _appStateSubscription = null

  if (_activeWorklet) {
    logLifecycle('startWorklet -> terminating the previous worklet', workletState(_activeWorklet))
    try {
      _activeWorklet.terminate()
    } catch (err) {
      console.error('[lifecycle] app failed to terminate the previous worklet', err)
    }
    _activeWorklet = null
  }

  if (_foregroundServiceActive) {
    ExpoBackgroundService.stopService()
    _foregroundServiceActive = false
  }

  _notificationStrings = {
    title: options?.notificationTitle ?? _notificationStrings.title,
    message: options?.notificationMessage ?? _notificationStrings.message,
  }

  const worklet = new Worklet()
  _activeWorklet = worklet
  logLifecycle('startWorklet -> booting a new worklet')
  worklet.start('app:/main.bundle', require('../backend/backend.bundle'), [storagePath])

  attachAppStateHandler(worklet, options?.onWorkletDied)

  const rpc = new HRPC(new FramedStream(worklet.IPC))
  setRPC(rpc)

  return { worklet, rpc }
}
