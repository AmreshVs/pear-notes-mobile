import HRPC from '@pear-notes/core/spec/hrpc/index.js'
import * as ExpoBackgroundService from 'expo-background-service'
import { AppState, AppStateStatus, Platform } from 'react-native'

import { getBackgroundSyncMode } from '@/lib/backgroundSync'

const { setRPC } = require('@pear-notes/core/rpc.js')
const FramedStream = require('framed-stream')
const { Worklet } = require('react-native-bare-kit')

const BACKGROUND_WAKEUP_DEADLINE_MS = 25_000
export const EXTENDED_BACKGROUND_WAKEUP_DEADLINE_MS = 5 * 60 * 1000

interface StartWorkletOptions {
  onWorkletDied?: () => void
  notificationTitle?: string
  notificationMessage?: string
}

let _activeWorklet: any = null
let _appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null
let _foregroundServiceActive = false
let _notificationStrings = { title: '', message: '' }

async function handleBackground(worklet: any) {
  if (Platform.OS === 'android') {
    try {
      const mode = await getBackgroundSyncMode()
      if (mode === 'always-on') {
        ExpoBackgroundService.startService(
          _notificationStrings.title,
          _notificationStrings.message,
          0,
        )
        _foregroundServiceActive = true
        worklet.wakeup(EXTENDED_BACKGROUND_WAKEUP_DEADLINE_MS)
        return
      }
    } catch {}
  }

  try {
    worklet.wakeup(BACKGROUND_WAKEUP_DEADLINE_MS)
  } catch {
    console.error('Failed to wake up the worklet')
  }
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

function handleActive(worklet: any, onWorkletDied?: () => void) {
  if (_foregroundServiceActive) {
    ExpoBackgroundService.stopService()
    _foregroundServiceActive = false
  }

  if (!worklet || worklet.terminated) {
    onWorkletDied?.()
  }
}

function attachAppStateHandler(worklet: any, onWorkletDied?: () => void) {
  _appStateSubscription?.remove()

  _appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
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
  _appStateSubscription?.remove()
  _appStateSubscription = null

  if (_activeWorklet) {
    try {
      _activeWorklet.terminate()
    } catch {}
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
  worklet.start('app:/main.bundle', require('../backend/backend.bundle'), [storagePath])

  attachAppStateHandler(worklet, options?.onWorkletDied)

  const rpc = new HRPC(new FramedStream(worklet.IPC))
  setRPC(rpc)

  return { worklet, rpc }
}
