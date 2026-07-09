import { BackgroundTaskResult, registerTaskAsync, unregisterTaskAsync } from 'expo-background-task'
import * as TaskManager from 'expo-task-manager'

import { BackgroundSyncMode } from './backgroundSync'

import { EXTENDED_BACKGROUND_WAKEUP_DEADLINE_MS, wakeActiveWorklet } from '@/utils/worklet'

export const BACKGROUND_SYNC_TASK_NAME = 'pear-notes-background-sync'

TaskManager.defineTask(BACKGROUND_SYNC_TASK_NAME, async () => {
  try {
    const woke = wakeActiveWorklet(EXTENDED_BACKGROUND_WAKEUP_DEADLINE_MS)
    return woke ? BackgroundTaskResult.Success : BackgroundTaskResult.Failed
  } catch {
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
