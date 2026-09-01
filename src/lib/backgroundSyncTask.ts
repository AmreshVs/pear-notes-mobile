import { BackgroundTaskResult, registerTaskAsync, unregisterTaskAsync } from 'expo-background-task'
import * as TaskManager from 'expo-task-manager'

import { SYNC_WAKE_RESULT } from '@pear-notes/core/constant.js'
import { recordBackgroundWake } from '@pear-notes/core/utils.js'

import { EXTENDED_BACKGROUND_WAKEUP_DEADLINE_MS, wakeActiveWorklet } from '@/utils/worklet'

import { BackgroundSyncMode } from './backgroundSync'

export const BACKGROUND_SYNC_TASK_NAME = 'pear-notes-background-sync'

TaskManager.defineTask(BACKGROUND_SYNC_TASK_NAME, async () => {
  try {
    const woke = wakeActiveWorklet(EXTENDED_BACKGROUND_WAKEUP_DEADLINE_MS)
    await recordBackgroundWake(woke ? SYNC_WAKE_RESULT.OK : SYNC_WAKE_RESULT.NO_WORKLET)
    return woke ? BackgroundTaskResult.Success : BackgroundTaskResult.Failed
  } catch {
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
  } catch (err) {
    console.error('Failed to apply background sync mode', err)
  }
}
