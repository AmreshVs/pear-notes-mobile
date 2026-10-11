import { AppState, Platform } from 'react-native'
import {
  BackgroundTaskResult,
  registerTaskAsync,
  triggerTaskWorkerForTestingAsync,
  unregisterTaskAsync,
} from 'expo-background-task'
import * as TaskManager from 'expo-task-manager'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { SYNC_WAKE_RESULT } from '@pear-notes/core/constant.js'
import * as log from '@pear-notes/core/log.js'
import { getSyncStatusSnapshot, recordBackgroundWake } from '@pear-notes/core/utils.js'

import { startBackendWorkletForBackgroundTask } from '@/lib/backendWorklet'
import { withTimeout } from '@/utils/withTimeout'
import {
  BACKGROUND_TASK_WAKEUP_DEADLINE_MS,
  EXTENDED_BACKGROUND_WAKEUP_DEADLINE_MS,
  isActiveWorkletSuspended,
  isBackendReady,
  isOtherBackgroundWindowOpen,
  setBackgroundSyncWindowActive,
  suspendActiveWorklet,
  suspendIfDeferredForBackgroundSync,
  terminateWorkletIfActive,
  waitForBackendReady,
  wakeActiveWorklet,
} from '@/utils/worklet'

import { BackgroundSyncMode, getCachedBackgroundSyncMode } from './backgroundSync'

export const BACKGROUND_SYNC_TASK_NAME = 'pear-notes-background-sync'

const BACKGROUND_SYNC_LOG_PREFIX = '[bg-sync]'
const BACKGROUND_SYNC_WINDOW_MS = 10_000
const COLD_START_SYNC_WINDOW_MS = 45_000
const SUPPORTS_COLD_START = Platform.OS === 'android'
const WORKLET_WAIT_TIMEOUT_MS = 15_000
const WORKLET_WAIT_POLL_MS = 500
const BACKGROUND_SYNC_POLL_MS = 1_000
const BACKGROUND_SUSPEND_SETTLE_MS = 2_000
const BACKGROUND_SYNC_MINIMUM_INTERVAL_MINUTES = 30
const BACKEND_RPC_TIMEOUT_MS = 10_000
const APP_LOG_FLUSH_GRACE_MS = 2_500
const BACKEND_READY_WAIT_MS = 120_000
const WAKE_RENEWAL_MS = 15_000

const isForeground = () => AppState.currentState === 'active'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type SyncCounters = { lastSyncAt: number; lastReceived: number }

async function readSyncCounters(): Promise<SyncCounters> {
  try {
    const snapshot = await withTimeout(
      getSyncStatusSnapshot(),
      BACKEND_RPC_TIMEOUT_MS,
      'getSyncStatusSnapshot',
    )
    return {
      lastSyncAt: snapshot?.lastSyncAt ?? 0,
      lastReceived: snapshot?.lastReceived ?? 0,
    }
  } catch (err) {
    log.info(BACKGROUND_SYNC_LOG_PREFIX + ' could not read sync counters', err)
    return { lastSyncAt: 0, lastReceived: 0 }
  }
}

async function recordWake(result: string): Promise<void> {
  try {
    await withTimeout(recordBackgroundWake(result), BACKEND_RPC_TIMEOUT_MS, 'recordBackgroundWake')
    log.info(BACKGROUND_SYNC_LOG_PREFIX + ' wake recorded, result=' + result)
  } catch (err) {
    log.info(BACKGROUND_SYNC_LOG_PREFIX + ' could not record wake result=' + result, err)
  }
}

function keepWorkletAwake(): () => void {
  const timer = setInterval(() => {
    if (isActiveWorkletSuspended()) wakeActiveWorklet(BACKGROUND_TASK_WAKEUP_DEADLINE_MS)
  }, WAKE_RENEWAL_MS)
  return () => clearInterval(timer)
}

async function suspendBackendServices(): Promise<void> {
  try {
    await withTimeout(backendApi.suspendServices(), BACKEND_RPC_TIMEOUT_MS, 'suspendServices')
  } catch (err) {
    log.info(BACKGROUND_SYNC_LOG_PREFIX + ' could not suspend backend services', err)
  }
}

async function resumeBackendServices(): Promise<void> {
  try {
    await withTimeout(backendApi.resumeServices(), BACKEND_RPC_TIMEOUT_MS, 'resumeServices')
  } catch (err) {
    log.info(BACKGROUND_SYNC_LOG_PREFIX + ' could not resume backend services', err)
  }
}

async function resuspendIfTaskWokeIt(wokeFromSuspended: boolean): Promise<void> {
  if (!wokeFromSuspended) {
    log.info(BACKGROUND_SYNC_LOG_PREFIX + ' worklet was already awake, leaving it running')
    return
  }

  if (isForeground()) {
    log.info(BACKGROUND_SYNC_LOG_PREFIX + ' app came to foreground, leaving it running')
    return
  }

  if (isOtherBackgroundWindowOpen()) {
    log.info(BACKGROUND_SYNC_LOG_PREFIX + ' another background task is running, leaving it awake')
    return
  }

  await suspendBackendServices()
  if (isForeground()) {
    log.info(BACKGROUND_SYNC_LOG_PREFIX + ' app came to foreground, resuming backend services')
    await resumeBackendServices()
    return
  }
  if (!suspendActiveWorklet()) return

  await delay(BACKGROUND_SUSPEND_SETTLE_MS)
  log.info(BACKGROUND_SYNC_LOG_PREFIX + ' re-suspended, settled')
}

async function waitForSyncWindow(windowMs: number): Promise<boolean> {
  const startedAt = Date.now()
  const before = await readSyncCounters()
  log.info(BACKGROUND_SYNC_LOG_PREFIX + ' watching for sync for up to ' + windowMs + 'ms')

  while (Date.now() - startedAt < windowMs) {
    await delay(BACKGROUND_SYNC_POLL_MS)
    const current = await readSyncCounters()
    if (current.lastSyncAt > before.lastSyncAt) {
      log.info(
        BACKGROUND_SYNC_LOG_PREFIX +
          ' sync landed after ' +
          (Date.now() - startedAt) +
          'ms, received ' +
          current.lastReceived +
          ' node(s) from peers',
      )
      return true
    }
  }

  log.info(
    BACKGROUND_SYNC_LOG_PREFIX + ' window closed after ' + (Date.now() - startedAt) + 'ms, no sync',
  )
  return false
}

type WorkletHandover = { woke: boolean; wokeFromSuspended: boolean }

async function waitForActiveWorklet(): Promise<WorkletHandover> {
  const startedAt = Date.now()
  const giveUpAt = startedAt + WORKLET_WAIT_TIMEOUT_MS
  log.info(
    BACKGROUND_SYNC_LOG_PREFIX +
      ' waiting for a worklet, timeout=' +
      WORKLET_WAIT_TIMEOUT_MS +
      'ms',
  )

  for (;;) {
    const wokeFromSuspended = isActiveWorkletSuspended()
    if (wakeActiveWorklet(BACKGROUND_TASK_WAKEUP_DEADLINE_MS)) {
      log.info(
        BACKGROUND_SYNC_LOG_PREFIX +
          ' worklet ready after ' +
          (Date.now() - startedAt) +
          'ms, wokeFromSuspended=' +
          wokeFromSuspended,
      )
      return { woke: true, wokeFromSuspended }
    }
    if (Date.now() >= giveUpAt) {
      log.info(BACKGROUND_SYNC_LOG_PREFIX + ' no worklet after ' + (Date.now() - startedAt) + 'ms')
      return { woke: false, wokeFromSuspended: false }
    }
    await delay(WORKLET_WAIT_POLL_MS)
  }
}

async function coldStartWorklet(): Promise<any | null> {
  if (!SUPPORTS_COLD_START) {
    log.info(
      BACKGROUND_SYNC_LOG_PREFIX + ' cold start unsupported on ' + Platform.OS + ', giving up',
    )
    return null
  }

  const startedAt = Date.now()
  log.info(BACKGROUND_SYNC_LOG_PREFIX + ' cold start requested')
  try {
    const worklet = await startBackendWorkletForBackgroundTask()
    const woke = !!worklet && wakeActiveWorklet(EXTENDED_BACKGROUND_WAKEUP_DEADLINE_MS)
    log.info(
      BACKGROUND_SYNC_LOG_PREFIX +
        ' cold start finished in ' +
        (Date.now() - startedAt) +
        'ms, worklet=' +
        !!worklet +
        ' woke=' +
        woke,
    )
    return worklet
  } catch (err) {
    log.error(
      BACKGROUND_SYNC_LOG_PREFIX + ' cold start failed after ' + (Date.now() - startedAt) + 'ms',
      err,
    )
    return null
  }
}

async function tearDownColdStartedWorklet(worklet: any): Promise<void> {
  log.info(BACKGROUND_SYNC_LOG_PREFIX + ' tearing down the cold started worklet')
  await delay(APP_LOG_FLUSH_GRACE_MS)
  if (AppState.currentState === 'active') {
    log.info(BACKGROUND_SYNC_LOG_PREFIX + ' app is in the foreground, keeping the worklet')
    return
  }
  const terminated = terminateWorkletIfActive(worklet)
  log.info(BACKGROUND_SYNC_LOG_PREFIX + ' cold started worklet terminated=' + terminated)
}

log.info(
  BACKGROUND_SYNC_LOG_PREFIX + ' task module loaded, registering ' + BACKGROUND_SYNC_TASK_NAME,
)

TaskManager.defineTask(BACKGROUND_SYNC_TASK_NAME, async () => {
  log.info(BACKGROUND_SYNC_LOG_PREFIX + ' task fired at ' + new Date().toISOString())
  let coldStartedWorklet: any = null
  let windowHeld = false
  const backendWasReady = isBackendReady()
  const stopKeepingAwake = keepWorkletAwake()
  try {
    const { woke, wokeFromSuspended } = await waitForActiveWorklet()

    if (!woke) {
      coldStartedWorklet = await coldStartWorklet()
      if (!coldStartedWorklet) {
        await recordWake(SYNC_WAKE_RESULT.NO_WORKLET)
        return BackgroundTaskResult.Failed
      }
    }

    setBackgroundSyncWindowActive(true)
    windowHeld = true
    if (!coldStartedWorklet && !backendWasReady) {
      const readyStartedAt = Date.now()
      const ready = await waitForBackendReady(BACKEND_READY_WAIT_MS)
      log.info(
        BACKGROUND_SYNC_LOG_PREFIX +
          ' app launched for this task, backend ready=' +
          ready +
          ' after ' +
          (Date.now() - readyStartedAt) +
          'ms',
      )
      if (!ready) return BackgroundTaskResult.Failed
    }
    const freshBoot = !!coldStartedWorklet || !backendWasReady
    const synced = await waitForSyncWindow(
      freshBoot ? COLD_START_SYNC_WINDOW_MS : BACKGROUND_SYNC_WINDOW_MS,
    )
    const result = synced ? SYNC_WAKE_RESULT.OK : SYNC_WAKE_RESULT.NO_CHANGES
    await recordWake(result)
    log.info(BACKGROUND_SYNC_LOG_PREFIX + ' coldStarted=' + !!coldStartedWorklet)
    stopKeepingAwake()
    if (!coldStartedWorklet) await resuspendIfTaskWokeIt(wokeFromSuspended)
    return BackgroundTaskResult.Success
  } catch (err) {
    log.error(BACKGROUND_SYNC_LOG_PREFIX + ' task error', err)
    await recordWake(SYNC_WAKE_RESULT.ERROR)
    return BackgroundTaskResult.Failed
  } finally {
    stopKeepingAwake()
    if (windowHeld) setBackgroundSyncWindowActive(false)
    if (coldStartedWorklet) await tearDownColdStartedWorklet(coldStartedWorklet)
    suspendIfDeferredForBackgroundSync()
  }
})

const ALWAYS_ON_NEEDS_PERIODIC_FALLBACK = Platform.OS === 'android'

function shouldRegisterPeriodicTask(mode: BackgroundSyncMode): boolean {
  if (mode === 'periodic') return true
  return mode === 'always-on' && ALWAYS_ON_NEEDS_PERIODIC_FALLBACK
}

export async function applyBackgroundSyncMode(mode: BackgroundSyncMode): Promise<void> {
  try {
    if (shouldRegisterPeriodicTask(mode)) {
      await registerTaskAsync(BACKGROUND_SYNC_TASK_NAME, {
        minimumInterval: BACKGROUND_SYNC_MINIMUM_INTERVAL_MINUTES,
      })
      log.info(
        BACKGROUND_SYNC_LOG_PREFIX +
          ' mode applied: ' +
          mode +
          ', periodic task registered every ' +
          BACKGROUND_SYNC_MINIMUM_INTERVAL_MINUTES +
          'min' +
          (mode === 'always-on' ? ' as the foreground-service fallback' : ''),
      )
    } else {
      await unregisterTaskAsync(BACKGROUND_SYNC_TASK_NAME)
      log.info(BACKGROUND_SYNC_LOG_PREFIX + ' mode applied: ' + mode + ', periodic task removed')
    }
  } catch (err) {
    log.error('[bg-sync] failed to apply background sync mode', err)
  }
}

export async function triggerBackgroundSyncForTesting(): Promise<void> {
  if (!__DEV__) return
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK_NAME)
    log.info(
      BACKGROUND_SYNC_LOG_PREFIX +
        ' manual trigger, registered=' +
        registered +
        ' mode=' +
        getCachedBackgroundSyncMode(),
    )
    await triggerTaskWorkerForTestingAsync()
  } catch (err) {
    log.info(BACKGROUND_SYNC_LOG_PREFIX + ' manual trigger failed', err)
  }
}
