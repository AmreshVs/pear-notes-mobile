import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import {
  clearActivity,
  fetchActivity,
  fetchActivityStats,
  fetchMoreActivity,
  getActivityDeviceFilter,
  getActivityEntries,
  getActivityFilter,
  getActivityHasMore,
  getActivityIsClearing,
  getActivityIsLoading,
  getActivityIsLoadingMore,
  getActivityStats,
  setActivityDeviceFilter,
  setActivityFilter,
  subscribeActivity,
  unsubscribeActivity,
} from '@pear-notes/core/store/slices/activitySlice.js'
import {
  getActivityLogEnabled,
  getActivityRetentionDays,
  updateSetting,
} from '@pear-notes/core/store/slices/settingsSlice.js'
import {
  getHasLinkedDevices,
  getSyncedDevices,
} from '@pear-notes/core/store/slices/syncedDevicesSlice.js'

import { type ActivityEntry, type ActivityGroup, groupActivityByDay } from '@/utils/activityUtils'

export function useActivityScreen() {
  const dispatch = useDispatch()

  const entries = useSelector(getActivityEntries) as ActivityEntry[]
  const devices = useSelector(getSyncedDevices) as any[]
  const hasLinkedDevices = useSelector(getHasLinkedDevices) as boolean
  const enabled = useSelector(getActivityLogEnabled) as boolean
  const retentionDays = useSelector(getActivityRetentionDays) as number
  const filter = useSelector(getActivityFilter) as string
  const deviceFilter = useSelector(getActivityDeviceFilter) as string
  const hasMore = useSelector(getActivityHasMore) as boolean
  const isLoading = useSelector(getActivityIsLoading) as boolean
  const isLoadingMore = useSelector(getActivityIsLoadingMore) as boolean
  const isClearing = useSelector(getActivityIsClearing) as boolean
  const stats = useSelector(getActivityStats) as { count: number; bytes: number }

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmingClear, setConfirmingClear] = useState(false)

  useEffect(() => {
    dispatch(fetchActivity())
    dispatch(fetchActivityStats())
    dispatch(subscribeActivity())
    return () => {
      dispatch(unsubscribeActivity())
    }
  }, [dispatch])

  useEffect(() => {
    dispatch(fetchActivity())
  }, [dispatch, filter, deviceFilter])

  const groups: ActivityGroup[] = useMemo(() => groupActivityByDay(entries), [entries])

  const toggleEnabled = useCallback(() => {
    dispatch(updateSetting({ key: 'activityLogEnabled', value: !enabled }))
  }, [dispatch, enabled])

  const selectRetention = useCallback(
    (days: number) => {
      dispatch(updateSetting({ key: 'activityRetentionDays', value: days }))
    },
    [dispatch],
  )

  const selectFilter = useCallback(
    (value: string) => {
      dispatch(setActivityFilter(value))
    },
    [dispatch],
  )

  const selectDevice = useCallback(
    (value: string) => {
      dispatch(setActivityDeviceFilter(value))
    },
    [dispatch],
  )

  const loadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) dispatch(fetchMoreActivity())
  }, [dispatch, hasMore, isLoadingMore])

  const toggleExpanded = useCallback((id: string) => {
    setExpandedId((current) => (current === id ? null : id))
  }, [])

  const requestClear = useCallback(() => {
    setConfirmingClear(true)
  }, [])

  const cancelClear = useCallback(() => {
    setConfirmingClear(false)
  }, [])

  const confirmClear = useCallback(() => {
    setConfirmingClear(false)
    setExpandedId(null)
    dispatch(clearActivity())
  }, [dispatch])

  return {
    groups,
    devices,
    enabled,
    retentionDays,
    filter,
    deviceFilter,
    hasMore,
    isLoading,
    isLoadingMore,
    isClearing,
    stats,
    expandedId,
    confirmingClear,
    hasLinkedDevices,
    // Activity is always listed in Settings now. With nothing linked there is no second
    // device to attribute changes to, so the screen shows why instead of an empty list.
    isEmpty: !hasLinkedDevices || (!isLoading && groups.length === 0),
    toggleEnabled,
    selectRetention,
    selectFilter,
    selectDevice,
    loadMore,
    toggleExpanded,
    requestClear,
    cancelClear,
    confirmClear,
  }
}
