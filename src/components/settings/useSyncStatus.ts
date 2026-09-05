import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { AppState } from 'react-native'
import { useSelector } from 'react-redux'

import { SYNC_WAKE_RESULT } from '@pear-notes/core/constant.js'
import {
  getHasLinkedDevices,
  getRemoteSyncedDevices,
} from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import { getSyncStatusSnapshot } from '@pear-notes/core/utils.js'

import {
  BackgroundSyncMode,
  getBackgroundSyncMode,
  getCachedBackgroundSyncMode,
  subscribeBackgroundSyncMode,
} from '@/lib/backgroundSync'
import { getRelativeTime } from '@/utils/relativeTime'

const WAKE_RESULT_LABEL_KEYS: Record<string, string> = {
  [SYNC_WAKE_RESULT.OK]: 'settings.syncStatus.wakeResultOk',
  [SYNC_WAKE_RESULT.NO_CHANGES]: 'settings.syncStatus.wakeResultNoChanges',
  [SYNC_WAKE_RESULT.NO_WORKLET]: 'settings.syncStatus.wakeResultNoWorklet',
  [SYNC_WAKE_RESULT.ERROR]: 'settings.syncStatus.wakeResultError',
}

const REFRESH_INTERVAL_MS = 30000
const BACKGROUND_STALE_MS = 24 * 60 * 60 * 1000

export type SyncVerdict =
  | 'ok'
  | 'noDevices'
  | 'neverSynced'
  | 'waiting'
  | 'serviceStopped'
  | 'backgroundStale'

type SyncSnapshot = {
  lastSyncAt: number
  lastReceived: number
  lastWakeAt: number
  lastWakeResult: string
  serviceFailedAt: number
}

const EMPTY_SNAPSHOT: SyncSnapshot = {
  lastSyncAt: 0,
  lastReceived: 0,
  lastWakeAt: 0,
  lastWakeResult: '',
  serviceFailedAt: 0,
}

function resolveVerdict(
  hasLinkedDevices: boolean,
  mode: BackgroundSyncMode,
  snapshot: SyncSnapshot,
  onlineCount: number,
): SyncVerdict {
  if (!hasLinkedDevices) return 'noDevices'
  if (mode === 'always-on' && snapshot.serviceFailedAt > 0) return 'serviceStopped'
  if (!snapshot.lastSyncAt) return 'neverSynced'
  if (onlineCount === 0) return 'waiting'
  if (
    mode === 'periodic' &&
    (!snapshot.lastWakeAt || Date.now() - snapshot.lastWakeAt > BACKGROUND_STALE_MS)
  ) {
    return 'backgroundStale'
  }
  return 'ok'
}

export function useSyncStatus() {
  const hasLinkedDevices = useSelector(getHasLinkedDevices) as boolean
  const remoteDevices = useSelector(getRemoteSyncedDevices) as any[]
  const [snapshot, setSnapshot] = useState<SyncSnapshot>(EMPTY_SNAPSHOT)
  const mode = useSyncExternalStore(subscribeBackgroundSyncMode, getCachedBackgroundSyncMode)

  const refresh = useCallback(() => {
    getSyncStatusSnapshot().then((next) => setSnapshot(next as SyncSnapshot))
    getBackgroundSyncMode()
  }, [])

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null

    const stopPolling = () => {
      if (!timer) return
      clearInterval(timer)
      timer = null
    }

    const startPolling = () => {
      if (timer) return
      timer = setInterval(refresh, REFRESH_INTERVAL_MS)
    }

    refresh()
    startPolling()

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        stopPolling()
        return
      }
      refresh()
      startPolling()
    })

    return () => {
      stopPolling()
      subscription.remove()
    }
  }, [refresh])

  const onlineDevices = remoteDevices.filter((device) => device.isOnline)
  const onlineNames = onlineDevices.map((device) => device.title).filter(Boolean)
  const peerNames = remoteDevices.map((device) => device.title).filter(Boolean)

  return {
    hasLinkedDevices,
    mode,
    lastSyncedRelative: getRelativeTime(snapshot.lastSyncAt),
    lastReceived: snapshot.lastReceived,
    lastWakeRelative: getRelativeTime(snapshot.lastWakeAt),
    lastWakeResult: snapshot.lastWakeResult,
    wakeResultKey: WAKE_RESULT_LABEL_KEYS[snapshot.lastWakeResult] ?? '',
    wakeSucceeded: snapshot.lastWakeResult === SYNC_WAKE_RESULT.OK,
    serviceFailedRelative: getRelativeTime(snapshot.serviceFailedAt),
    onlineNames,
    peerName: peerNames[0] || '',
    verdict: resolveVerdict(hasLinkedDevices, mode, snapshot, onlineDevices.length),
  }
}
