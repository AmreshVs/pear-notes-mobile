import { AppState } from 'react-native'
import { BackgroundTaskResult, registerTaskAsync, unregisterTaskAsync } from 'expo-background-task'
import * as TaskManager from 'expo-task-manager'

import { backendApi } from '@pear-notes/core/backend/api.js'
import * as log from '@pear-notes/core/log.js'
import { LOCAL_AI_ENABLED } from '@pear-notes/core/store/services/localAiCatalog.js'

import { isPluggedIn } from '@/lib/battery'
import { withTimeout } from '@/utils/withTimeout'
import {
  BACKGROUND_TASK_WAKEUP_DEADLINE_MS,
  isActiveWorkletSuspended,
  isBackendReady,
  setBackgroundSyncWindowActive,
  suspendIfDeferredForBackgroundSync,
  wakeActiveWorklet,
} from '@/utils/worklet'

export const BACKGROUND_INDEX_TASK_NAME = 'pear-notes-background-index'
export const INDEX_ONLY_WHILE_CHARGING_KEY = 'indexOnlyWhileCharging'

const LOG_PREFIX = '[bg-index]'
const INDEX_WINDOW_MS = 4 * 60 * 1000
const POLL_MS = 2_000
const START_GRACE_MS = 6_000
const WAKE_RENEWAL_MS = 15_000
const MINIMUM_INTERVAL_MINUTES = 60
const PREFERENCE_TIMEOUT_MS = 10_000

type IndexState = { enabled: boolean; status: string; deferred?: number }
type StoreLike = {
  getState: () => any
  dispatch: (action: unknown) => unknown
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function loadAppStore(): { store: StoreLike; slice: any } | null {
  try {
    const { store } = require('@pear-notes/core/store/store.js') as { store: StoreLike }
    const slice = require('@pear-notes/core/store/slices/localAiSlice.js')
    return { store, slice }
  } catch {
    return null
  }
}

function indexBusy(store: StoreLike, slice: any): boolean {
  const index = slice.getLocalAiIndex(store.getState()) as IndexState
  return index.status === 'running' || index.status === 'waiting'
}

async function runIndexWindow(store: StoreLike, slice: any): Promise<string> {
  const index = slice.getLocalAiIndex(store.getState()) as IndexState
  if (!index.enabled) return 'index off'
  store.dispatch({
    type: slice.localAiConditionsChanged.type,
    payload: { foreground: false, charging: true },
  })
  store.dispatch(slice.indexLocalAiInBackground())
  const startedAt = Date.now()
  let sawWork = false
  while (Date.now() - startedAt < INDEX_WINDOW_MS) {
    await delay(POLL_MS)
    if (AppState.currentState === 'active') return 'app opened'
    const busy = indexBusy(store, slice)
    sawWork = sawWork || busy
    if (!busy && (sawWork || Date.now() - startedAt > START_GRACE_MS)) {
      return sawWork ? 'finished' : 'nothing to index'
    }
  }
  return 'window closed'
}

TaskManager.defineTask(BACKGROUND_INDEX_TASK_NAME, async () => {
  if (!LOCAL_AI_ENABLED || AppState.currentState === 'active') {
    return BackgroundTaskResult.Success
  }
  if (!isBackendReady()) {
    log.info(LOG_PREFIX + ' app not running, skipped')
    return BackgroundTaskResult.Success
  }
  if (!(await isPluggedIn())) {
    log.info(LOG_PREFIX + ' not charging, skipped')
    return BackgroundTaskResult.Success
  }
  const app = loadAppStore()
  if (!app) return BackgroundTaskResult.Success
  const renew = setInterval(() => {
    if (isActiveWorkletSuspended()) wakeActiveWorklet(BACKGROUND_TASK_WAKEUP_DEADLINE_MS)
  }, WAKE_RENEWAL_MS)
  setBackgroundSyncWindowActive(true)
  try {
    if (isActiveWorkletSuspended()) wakeActiveWorklet(BACKGROUND_TASK_WAKEUP_DEADLINE_MS)
    const startedAt = Date.now()
    const outcome = await runIndexWindow(app.store, app.slice)
    log.info(LOG_PREFIX + ' ' + outcome + ' after ' + (Date.now() - startedAt) + 'ms')
    return BackgroundTaskResult.Success
  } catch (err) {
    log.error(LOG_PREFIX + ' task error', err)
    return BackgroundTaskResult.Failed
  } finally {
    clearInterval(renew)
    setBackgroundSyncWindowActive(false)
    suspendIfDeferredForBackgroundSync()
  }
})

export async function applyBackgroundIndex(enabled: boolean): Promise<void> {
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_INDEX_TASK_NAME)
    if (enabled && !registered) {
      await registerTaskAsync(BACKGROUND_INDEX_TASK_NAME, {
        minimumInterval: MINIMUM_INTERVAL_MINUTES,
      })
    } else if (!enabled && registered) {
      await unregisterTaskAsync(BACKGROUND_INDEX_TASK_NAME)
    }
  } catch (err) {
    log.warn(LOG_PREFIX + ' could not update registration', err)
  }
}

export async function loadIndexOnlyWhileCharging(): Promise<boolean> {
  try {
    const value = await withTimeout(
      backendApi.getPreference({ key: INDEX_ONLY_WHILE_CHARGING_KEY }),
      PREFERENCE_TIMEOUT_MS,
      'getPreference',
    )
    return value !== 'false'
  } catch {
    return true
  }
}

export async function saveIndexOnlyWhileCharging(on: boolean): Promise<void> {
  await backendApi.updatePreference({ key: INDEX_ONLY_WHILE_CHARGING_KEY, value: String(on) })
}
