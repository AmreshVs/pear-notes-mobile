import HRPC from '@pear-notes/core/spec/hrpc/index.js'
import { AppState, AppStateStatus } from 'react-native'

const { setRPC } = require('@pear-notes/core/rpc.js')
const FramedStream = require('framed-stream')
const { Worklet } = require('react-native-bare-kit')

const BACKGROUND_WAKEUP_DEADLINE_MS = 25_000

let _activeWorklet: any = null
let _appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null

function attachAppStateHandler(worklet: any) {
  _appStateSubscription?.remove()

  _appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (!worklet || worklet.terminated) return

    if (state === 'background') {
      try {
        worklet.wakeup(BACKGROUND_WAKEUP_DEADLINE_MS)
      } catch {
        console.error('Failed to wake up the worklet')
      }
    }
  })
}

export async function startWorklet(storagePath: string) {
  _appStateSubscription?.remove()
  _appStateSubscription = null

  if (_activeWorklet) {
    try {
      _activeWorklet.terminate()
    } catch {}
    _activeWorklet = null
  }

  const worklet = new Worklet()
  _activeWorklet = worklet
  worklet.start('app:/main.bundle', require('../backend/backend.bundle'), [storagePath])

  attachAppStateHandler(worklet)

  const rpc = new HRPC(new FramedStream(worklet.IPC))
  setRPC(rpc)

  return { worklet, rpc }
}
