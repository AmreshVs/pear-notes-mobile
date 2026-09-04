import { AppState } from 'react-native'
import {
  BackgroundTaskResult,
  registerTaskAsync,
  triggerTaskWorkerForTestingAsync,
  unregisterTaskAsync,
} from 'expo-background-task'
import * as TaskManager from 'expo-task-manager'

import { SYNC_WAKE_RESULT } from '@pear-notes/core/constant.js'
import { getSyncStatusSnapshot, recordBackgroundWake } from '@pear-notes/core/utils.js'

import {
  EXTENDED_BACKGROUND_WAKEUP_DEADLINE_MS,
  isActiveWorkletSuspended,
  suspendActiveWorklet,
  wakeActiveWorklet,
} from '@/utils/worklet'

import { BackgroundSyncMode, getCachedBackgroundSyncMode } from './backgroundSync'

export const BACKGROUND_SYNC_TASK_NAME = 'pear-notes-background-sync'

const BACKGROUND_SYNC_LOG_PREFIX = '[bg-sync]'
const BACKGROUND_SYNC_WINDOW_MS = 10_000
const BACKGROUND_SYNC_POLL_MS = 1_000
const BACKGROUND_SUSPEND_SETTLE_MS = 2_000

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type SyncCounters = { lastSyncAt: number; lastReceived: number }

async function readSyncCounters(): Promise<SyncCounters> {
  try {
    const snapshot = await getSyncStatusSnapshot()
    return {
      lastSyncAt: snapshot?.lastSyncAt ?? 0,
      lastReceived: snapshot?.lastReceived ?? 0,
    }
  } catch {
    return { lastSyncAt: 0, lastReceived: 0 }
  }
}

async function resuspendIfTaskWokeIt(wokeFromSuspended: boolean): Promise<void> {
  if (!wokeFromSuspended) {
    console.log(BACKGROUND_SYNC_LOG_PREFIX + ' worklet was already awake, leaving it running')
    return
  }

  if (AppState.currentState === 'active') {
    console.log(BACKGROUND_SYNC_LOG_PREFIX + ' app came to foreground, leaving it running')
    return
  }

  if (!suspendActiveWorklet()) return

  await delay(BACKGROUND_SUSPEND_SETTLE_MS)
  console.log(BACKGROUND_SYNC_LOG_PREFIX + ' re-suspended, settled')
}

async function waitForSyncWindow(): Promise<boolean> {
  const startedAt = Date.now()
  const before = await readSyncCounters()

  while (Date.now() - startedAt < BACKGROUND_SYNC_WINDOW_MS) {
    await delay(BACKGROUND_SYNC_POLL_MS)
    const current = await readSyncCounters()
    if (current.lastSyncAt > before.lastSyncAt) {
      console.log(
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

  console.log(
    BACKGROUND_SYNC_LOG_PREFIX + ' window closed after ' + (Date.now() - startedAt) + 'ms, no sync',
  )
  return false
}

TaskManager.defineTask(BACKGROUND_SYNC_TASK_NAME, async () => {
  console.log(BACKGROUND_SYNC_LOG_PREFIX + ' task fired at ' + new Date().toISOString())
  try {
    const wokeFromSuspended = isActiveWorkletSuspended()
    const woke = wakeActiveWorklet(EXTENDED_BACKGROUND_WAKEUP_DEADLINE_MS)
    console.log(
      BACKGROUND_SYNC_LOG_PREFIX +
        ' wakeActiveWorklet=' +
        woke +
        ' wokeFromSuspended=' +
        wokeFromSuspended,
    )

    if (!woke) {
      await recordBackgroundWake(SYNC_WAKE_RESULT.NO_WORKLET)
      return BackgroundTaskResult.Failed
    }

    await waitForSyncWindow()
    await recordBackgroundWake(SYNC_WAKE_RESULT.OK)
    await resuspendIfTaskWokeIt(wokeFromSuspended)
    return BackgroundTaskResult.Success
  } catch (err) {
    console.log(BACKGROUND_SYNC_LOG_PREFIX + ' task error', err)
    await recordBackgroundWake(SYNC_WAKE_RESULT.ERROR)
    return BackgroundTaskResult.Failed
  }
})

export async function applyBackgroundSyncMode(mode: BackgroundSyncMode): Promise<void> {
  try {
    if (mode === 'periodic') {
      await registerTaskAsync(BACKGROUND_SYNC_TASK_NAME, { minimumInterval: 30 })
    } else {
      await unregisterTaskAsync(BACKGROUND_SYNC_TASK_NAME)
    }
    console.log(BACKGROUND_SYNC_LOG_PREFIX + ' mode applied: ' + mode)
  } catch (err) {
    console.error('Failed to apply background sync mode', err)
  }
}

export async function triggerBackgroundSyncForTesting(): Promise<void> {
  if (!__DEV__) return
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK_NAME)
    console.log(
      BACKGROUND_SYNC_LOG_PREFIX +
        ' manual trigger, registered=' +
        registered +
        ' mode=' +
        getCachedBackgroundSyncMode(),
    )
    await triggerTaskWorkerForTestingAsync()
  } catch (err) {
    console.log(BACKGROUND_SYNC_LOG_PREFIX + ' manual trigger failed', err)
  }
}
