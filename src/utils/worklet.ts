import { AppState, AppStateStatus, Platform } from 'react-native'
import * as ExpoBackgroundService from 'expo-background-service'

import { backendApi } from '@pear-notes/core/backend/api.js'
import * as log from '@pear-notes/core/log.js'
import HRPC from '@pear-notes/core/spec/hrpc/index.js'
import {
  clearBackgroundServiceFailure,
  recordBackgroundServiceFailure,
} from '@pear-notes/core/utils.js'

import { getCachedBackgroundSyncMode } from '@/lib/backgroundSync'

const { setRPC } = require('@pear-notes/core/rpc.js')
const FramedStream = require('framed-stream')
const { Worklet } = require('react-native-bare-kit')

const WORKLET_EXITED = 'exited'

class ObservedWorklet extends Worklet {
  terminate() {
    const wasRunning = !this.terminated
    super.terminate()
    if (wasRunning) this.emit(WORKLET_EXITED)
  }
}

const BACKGROUND_LINGER_MS = 20_000
const RESYNC_AFTER_AWAY_MS = 20_000
export const EXTENDED_BACKGROUND_WAKEUP_DEADLINE_MS = 5 * 60 * 1000
export const BACKGROUND_TASK_WAKEUP_DEADLINE_MS = 20_000
const KEEP_ALIVE_RENEWAL_MS = 60 * 1000

interface StartWorkletOptions {
  onWorkletDied?: () => void
  onResumed?: () => void
  notificationTitle?: string
  notificationMessage?: string
}

let _activeWorklet: any = null
const _deliberateTerminations = new WeakSet<object>()
let _appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null
let _foregroundServiceActive = false
let _keepAliveTimer: ReturnType<typeof setInterval> | null = null
let _notificationStrings = { title: '', message: '' }
let _backgroundWindowHolds = 0
let _suspendDeferredForBackgroundSync = false
let _awaySince: number | null = null
let _serviceStoppedSubscription: { remove: () => void } | null = null
let _backendReadyWorklet: any = null
let _backendReadyWaiters: (() => void)[] = []

function logLifecycle(message: string, detail?: Record<string, unknown>) {
  const suffix = detail
    ? ' ' +
      Object.entries(detail)
        .map(([key, value]) => key + '=' + String(value))
        .join(' ')
    : ''
  log.info('[lifecycle] app ' + message + suffix)
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
      log.error('[lifecycle] app failed to start the background sync service', err)
      recordBackgroundServiceFailure()
    }
  }

  suspendForBackground(worklet)
}

function suspendForBackground(worklet: any) {
  if (_backgroundWindowHolds > 0) {
    _suspendDeferredForBackgroundSync = true
    logLifecycle('background -> background sync in flight, staying awake', workletState(worklet))
    try {
      worklet.wakeup(BACKGROUND_TASK_WAKEUP_DEADLINE_MS)
    } catch (err) {
      log.error('[lifecycle] app failed to keep the worklet awake for background sync', err)
    }
    return
  }

  logLifecycle('background -> suspend', workletState(worklet))

  try {
    worklet.suspend(BACKGROUND_LINGER_MS)
    logLifecycle('background -> suspend returned', workletState(worklet))
  } catch (err) {
    log.error('[lifecycle] app failed to suspend the worklet', err)
  }
}

function handleServiceStoppedBySystem({ reason }: { reason: string }) {
  const worklet = _activeWorklet
  log.error('[lifecycle] app background sync service stopped by Android: ' + reason, {
    ...workletState(worklet),
    appState: AppState.currentState,
    wasActive: _foregroundServiceActive,
  })
  if (!_foregroundServiceActive) return
  _foregroundServiceActive = false
  stopKeepAlive()
  if (reason === 'start-rejected') recordBackgroundServiceFailure()
  if (!worklet || worklet.terminated || AppState.currentState === 'active') return
  suspendForBackground(worklet)
}

function watchServiceStops() {
  if (Platform.OS !== 'android' || _serviceStoppedSubscription) return
  _serviceStoppedSubscription = ExpoBackgroundService.addServiceStoppedListener(
    handleServiceStoppedBySystem,
  )
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

export function markBackendReady(): void {
  _backendReadyWorklet = _activeWorklet
  const waiters = _backendReadyWaiters
  _backendReadyWaiters = []
  for (const waiter of waiters) waiter()
}

export function isBackendReady(): boolean {
  return !!_activeWorklet && !_activeWorklet.terminated && _backendReadyWorklet === _activeWorklet
}

export function waitForBackendReady(timeoutMs: number): Promise<boolean> {
  if (isBackendReady()) return Promise.resolve(true)
  return new Promise((resolve) => {
    const waiter = () => {
      clearTimeout(timer)
      resolve(isBackendReady())
    }
    const timer = setTimeout(() => {
      _backendReadyWaiters = _backendReadyWaiters.filter((w) => w !== waiter)
      resolve(false)
    }, timeoutMs)
    _backendReadyWaiters.push(waiter)
  })
}

export function isActiveWorkletSuspended(): boolean {
  return !!_activeWorklet && !_activeWorklet.terminated && _activeWorklet.suspended === true
}

export function setBackgroundSyncWindowActive(active: boolean): void {
  if (active && _backgroundWindowHolds === 0) _suspendDeferredForBackgroundSync = false
  _backgroundWindowHolds = Math.max(0, _backgroundWindowHolds + (active ? 1 : -1))
}

export function isOtherBackgroundWindowOpen(): boolean {
  return _backgroundWindowHolds > 1
}

export function suspendIfDeferredForBackgroundSync(): boolean {
  if (_backgroundWindowHolds > 0 || !_suspendDeferredForBackgroundSync) return false
  _suspendDeferredForBackgroundSync = false
  if (AppState.currentState === 'active') return false

  logLifecycle('background task -> applying the suspend it deferred', workletState(_activeWorklet))
  return suspendActiveWorklet()
}

export function terminateWorkletIfActive(worklet: any): boolean {
  if (!worklet) return false

  if (worklet !== _activeWorklet) {
    logLifecycle('background task -> another worklet is active, leaving it alone', {
      ...workletState(_activeWorklet),
      hasActive: !!_activeWorklet,
    })
    return false
  }

  logLifecycle('background task -> terminating the worklet it started', workletState(worklet))

  stopKeepAlive()
  _appStateSubscription?.remove()
  _appStateSubscription = null
  _activeWorklet = null
  _deliberateTerminations.add(worklet)

  try {
    worklet.terminate()
    logLifecycle('background task -> terminate returned', workletState(worklet))
    return true
  } catch (err) {
    log.error('[lifecycle] app failed to terminate the background-task worklet', err)
    return false
  }
}

export function suspendActiveWorklet(): boolean {
  if (!_activeWorklet || _activeWorklet.terminated) return false
  if (AppState.currentState === 'active') {
    logLifecycle(
      'background task -> re-suspend skipped, app is active',
      workletState(_activeWorklet),
    )
    return false
  }

  logLifecycle('background task -> re-suspend', workletState(_activeWorklet))

  try {
    _activeWorklet.suspend(0)
    return true
  } catch (err) {
    log.error('[lifecycle] app failed to re-suspend after the background task', err)
    return false
  }
}

function handleActive(worklet: any, onWorkletDied?: () => void, onResumed?: () => void) {
  const awaySince = _awaySince
  _awaySince = null
  const wasSuspended = worklet?.suspended === true
  const wasAwayLong = awaySince !== null && Date.now() - awaySince >= RESYNC_AFTER_AWAY_MS

  _suspendDeferredForBackgroundSync = false
  stopKeepAlive()

  if (_foregroundServiceActive) {
    ExpoBackgroundService.stopService()
    _foregroundServiceActive = false
  }

  if (!worklet || worklet.terminated) {
    log.error('[lifecycle] app active -> worklet is dead, restarting', workletState(worklet))
    onWorkletDied?.()
    return
  }

  logLifecycle('active -> resume', workletState(worklet))

  try {
    worklet.resume()
    logLifecycle('active -> resume returned', workletState(worklet))
  } catch (err) {
    log.error('[lifecycle] app failed to resume the worklet', err)
  }

  if (wasSuspended || wasAwayLong) {
    logLifecycle('active -> resync', { wasSuspended, wasAwayLong })
    onResumed?.()
  }
}

function attachAppStateHandler(worklet: any, options?: StartWorkletOptions) {
  _appStateSubscription?.remove()

  _appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
    logLifecycle('AppState ' + state, workletState(worklet))

    if (state === 'active') {
      handleActive(worklet, options?.onWorkletDied, options?.onResumed)
      return
    }

    if (_awaySince === null) _awaySince = Date.now()

    if (!worklet || worklet.terminated) return

    if (state === 'background') {
      handleBackground(worklet)
    }
  })
}

export async function startWorklet(storagePath: string, options?: StartWorkletOptions) {
  backendApi.captureAppLogs()
  stopKeepAlive()
  _appStateSubscription?.remove()
  _appStateSubscription = null
  _awaySince = null

  if (_activeWorklet) {
    logLifecycle('startWorklet -> terminating the previous worklet', workletState(_activeWorklet))
    const previous = _activeWorklet
    _activeWorklet = null
    _deliberateTerminations.add(previous)
    try {
      previous.terminate()
    } catch (err) {
      log.error('[lifecycle] app failed to terminate the previous worklet', err)
    }
  }

  if (_foregroundServiceActive) {
    ExpoBackgroundService.stopService()
    _foregroundServiceActive = false
  }

  _notificationStrings = {
    title: options?.notificationTitle ?? _notificationStrings.title,
    message: options?.notificationMessage ?? _notificationStrings.message,
  }

  watchServiceStops()

  const worklet = new ObservedWorklet()
  _activeWorklet = worklet
  logLifecycle('startWorklet -> booting a new worklet')

  // The native side calls terminate() when the Bare worklet exits on its own.
  // Without this listener a backend that dies in the foreground is invisible:
  // every pending hrpc request stays unresolved forever, so the app still reads
  // whatever the store already holds but can no longer save, delete or create.
  worklet.on(WORKLET_EXITED, () => {
    if (_deliberateTerminations.has(worklet)) return
    if (_activeWorklet !== worklet) return
    log.error('[lifecycle] app worklet terminated on its own -> restarting', workletState(worklet))
    _activeWorklet = null
    stopKeepAlive()
    options?.onWorkletDied?.()
  })

  worklet.start('app:/main.bundle', require('../backend/backend.bundle'), [storagePath])

  attachAppStateHandler(worklet, options)

  const rpc = new HRPC(new FramedStream(worklet.IPC))
  setRPC(rpc)

  return { worklet, rpc }
}
