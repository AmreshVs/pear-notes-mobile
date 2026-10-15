import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { AppState, DeviceEventEmitter, Platform } from 'react-native'
import { useSelector } from 'react-redux'
import { usePathname } from 'expo-router'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { reminderAt } from '@pear-notes/core/store/services/noteTasks.js'
import { isRemindersEnabled } from '@pear-notes/core/store/services/reminders.js'
import {
  addCatchUpDay,
  answerDeviceTip,
  backgroundSyncTips,
  CATCH_UP_WINDOW_MS,
  isDeviceTip,
  loadTipRecords,
  pickTip,
  saveTipAnswer,
  selectStoreTips,
  setTipsEnabled,
  TIP,
  tipRecord,
} from '@pear-notes/core/store/services/tips.js'
import { getLocalAiIndex } from '@pear-notes/core/store/slices/localAiSlice.js'
import {
  getHasLinkedDevices,
  getRemoteSyncedDevices,
  getSyncedDevices,
} from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import { getSyncStatusSnapshot } from '@pear-notes/core/utils.js'

import { REMINDERS_CHANGED_EVENT } from '@/hooks/useReminderPrefs'
import { useAppUpdateNoticeVisible } from '@/lib/appUpdateNoticeVisibility'
import {
  getBackgroundSyncMode,
  getBackgroundSyncModeSince,
  getCachedBackgroundSyncMode,
  subscribeBackgroundSyncMode,
} from '@/lib/backgroundSync'
import { useBackupNudgeVisible } from '@/lib/backupNudgeVisibility'
import { useNoteEditor } from '@/providers/NoteEditorContext'

import {
  isBackgroundRefreshAllowed,
  isIgnoringBatteryOptimizations,
} from '../../modules/expo-background-service/src'

type TipLocal = {
  firstSeenAt?: number
  lastShownAt?: number
  currentTip?: string | null
  records?: Record<string, unknown>
  catchUpDays?: number[]
}
type TipRecords = { records: Record<string, unknown>; enabled: boolean }
type SyncSnapshot = { lastSyncAt: number; lastWakeAt: number; serviceFailedAt: number }
type SyncInputs = {
  backgroundAllowed: boolean
  batteryRestricted: boolean
  snapshot: SyncSnapshot
  modeSince: number
}
type RemoteDevice = { title?: string; platform?: string; isOnline?: boolean }
type Task = { date: string; time: string | null; done?: boolean; yearly?: boolean }

const LOCAL_KEY = 'tipsLocal'
const MAC_PLATFORM = 'darwin'
const REFRESH_MS = 5 * 60 * 1000
const SOON_MS = 3 * 24 * 60 * 60 * 1000
const HIDDEN_ROUTE_PREFIXES = ['/settings', '/note']
export const TIPS_CHANGED_EVENT = 'pear-notes:tips-changed'

const readLocal = async (): Promise<TipLocal> => {
  const value = await backendApi.getPreference({ key: LOCAL_KEY }).catch(() => null)
  return value && typeof value === 'object' ? (value as TipLocal) : {}
}

const writeLocal = (value: TipLocal) =>
  backendApi.updatePreference({ key: LOCAL_KEY, value }).catch(() => {})

const readSyncInputs = async (): Promise<SyncInputs> => {
  const [backgroundAllowed, snapshot, modeSince] = await Promise.all([
    isBackgroundRefreshAllowed(),
    getSyncStatusSnapshot() as Promise<SyncSnapshot>,
    getBackgroundSyncModeSince(),
    getBackgroundSyncMode(),
  ])
  return {
    backgroundAllowed,
    batteryRestricted: !isIgnoringBatteryOptimizations(),
    snapshot,
    modeSince,
  }
}

const recordCatchUpIfBehind = async (openedAt: number): Promise<number[] | null> => {
  const snapshot = (await getSyncStatusSnapshot()) as SyncSnapshot
  if (snapshot.lastSyncAt < openedAt) return null
  const stored = await readLocal()
  const catchUpDays = addCatchUpDay(stored.catchUpDays ?? [], openedAt) as number[]
  await writeLocal({ ...stored, catchUpDays })
  return catchUpDays
}

function taskTips(tasks: Task[], remindersOn: boolean, now: number): string[] {
  const tips: string[] = []
  const open = tasks.filter((task) => !task.done)
  const soon = (task: Task) =>
    !!task.time && reminderAt(task) > now && reminderAt(task) - now < SOON_MS
  if (!remindersOn && open.some(soon)) tips.push(TIP.REMINDERS_OFF)
  if (open.some((task) => task.yearly)) tips.push(TIP.YEARLY_DATES)
  return tips
}

export function useTipsEnabled(): [boolean, () => void] {
  const [enabled, setEnabled] = useState(true)
  useEffect(() => {
    let active = true
    const load = () =>
      loadTipRecords()
        .then((loaded: TipRecords) => active && setEnabled(loaded.enabled))
        .catch(() => {})
    load()
    const changed = DeviceEventEmitter.addListener(TIPS_CHANGED_EVENT, load)
    return () => {
      active = false
      changed.remove()
    }
  }, [])
  const toggle = useCallback(() => {
    const next = !enabled
    setEnabled(next)
    setTipsEnabled(next)
      .then(() => DeviceEventEmitter.emit(TIPS_CHANGED_EVENT))
      .catch(() => {})
  }, [enabled])
  return [enabled, toggle]
}

export function useTips() {
  const storeTips = useSelector((state) => selectStoreTips(state, true)) as string[]
  const { isOpen: noteOpen } = useNoteEditor()
  const pathname = usePathname()
  const updateNoticeVisible = useAppUpdateNoticeVisible()
  const backupNudgeVisible = useBackupNudgeVisible()
  const [tasks, setTasks] = useState<Task[]>([])
  const [remindersOn, setRemindersOn] = useState(true)
  const [loaded, setLoaded] = useState<TipRecords | null>(null)
  const [local, setLocal] = useState<TipLocal | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [syncInputs, setSyncInputs] = useState<SyncInputs | null>(null)
  const hasLinkedDevices = useSelector(getHasLinkedDevices) as boolean
  const allDevices = useSelector(getSyncedDevices) as unknown[]
  const syncMode = useSyncExternalStore(subscribeBackgroundSyncMode, getCachedBackgroundSyncMode)

  const refresh = useCallback(() => {
    Promise.all([
      backendApi.getUpcomingTasks().catch(() => []) as Promise<Task[]>,
      isRemindersEnabled(backendApi).catch(() => true) as Promise<boolean>,
      loadTipRecords() as Promise<TipRecords>,
      readLocal(),
      readSyncInputs(),
    ])
      .then(([nextTasks, reminders, records, stored, sync]) => {
        const nextLocal = stored.firstSeenAt ? stored : { ...stored, firstSeenAt: Date.now() }
        if (!stored.firstSeenAt) writeLocal(nextLocal)
        setTasks(nextTasks)
        setRemindersOn(reminders)
        setLoaded(records)
        setLocal(nextLocal)
        setSyncInputs(sync)
        setNow(Date.now())
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    let catchUpTimer: ReturnType<typeof setTimeout> | null = null
    const watchOpen = () => {
      const openedAt = Date.now()
      if (catchUpTimer) clearTimeout(catchUpTimer)
      catchUpTimer = setTimeout(() => {
        recordCatchUpIfBehind(openedAt)
          .then((catchUpDays) => {
            if (catchUpDays) setLocal((prev) => (prev ? { ...prev, catchUpDays } : prev))
          })
          .catch(() => {})
      }, CATCH_UP_WINDOW_MS)
    }
    watchOpen()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        watchOpen()
        refresh()
      } else if (catchUpTimer) {
        clearTimeout(catchUpTimer)
        catchUpTimer = null
      }
    })
    return () => {
      subscription.remove()
      if (catchUpTimer) clearTimeout(catchUpTimer)
    }
  }, [refresh])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, REFRESH_MS)
    const tipsChanged = DeviceEventEmitter.addListener(TIPS_CHANGED_EVENT, refresh)
    const remindersChanged = DeviceEventEmitter.addListener(REMINDERS_CHANGED_EVENT, refresh)
    return () => {
      clearInterval(timer)
      tipsChanged.remove()
      remindersChanged.remove()
    }
  }, [refresh])

  const onMainScreen = !HIDDEN_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  const canShow = onMainScreen && !noteOpen && !updateNoticeVisible && !backupNudgeVisible

  const syncTips = useMemo(
    () =>
      syncInputs
        ? (backgroundSyncTips({
            ...syncInputs,
            platform: Platform.OS,
            mode: syncMode,
            hasLinkedDevices,
            devices: allDevices,
            catchUpDays: local?.catchUpDays,
            now,
          }) as string[])
        : [],
    [syncInputs, syncMode, hasLinkedDevices, allDevices, local?.catchUpDays, now],
  )

  const tip = useMemo(() => {
    if (!loaded || !local || !canShow) return null
    return pickTip({
      eligible: [...syncTips, ...storeTips, ...taskTips(tasks, remindersOn, now)],
      records: loaded.records,
      local,
      now,
      enabled: loaded.enabled,
    }) as string | null
  }, [loaded, local, canShow, syncTips, storeTips, tasks, remindersOn, now])

  useEffect(() => {
    if (!tip || !local || local.currentTip === tip) return
    const next = { ...local, currentTip: tip, lastShownAt: Date.now() }
    setLocal(next)
    writeLocal(next)
  }, [tip, local])

  const answer = useCallback(
    async (action: string) => {
      if (!tip || !loaded || !local) return
      const cleared = { ...local, currentTip: null }
      const next = isDeviceTip(tip) ? answerDeviceTip(cleared, tip, action) : cleared
      setLocal(next)
      await writeLocal(next)
      if (!isDeviceTip(tip)) {
        await saveTipAnswer(tip, tipRecord(loaded.records, tip), action).catch(() => {})
      }
      DeviceEventEmitter.emit(TIPS_CHANGED_EVENT)
    },
    [tip, loaded, local],
  )

  const index = useSelector(getLocalAiIndex) as { deferred: number }
  const devices = useSelector(getRemoteSyncedDevices) as RemoteDevice[]
  const macTitle = useMemo(
    () =>
      devices.find((device) => device.platform === MAC_PLATFORM && device.isOnline)?.title ?? '',
    [devices],
  )
  const deferredCount = index.deferred

  return { tip, answer, deferredCount, macTitle }
}
