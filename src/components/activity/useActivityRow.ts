import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import {
  fetchActivityDiff,
  getActivityDiffs,
  getIsRecoveringWrite,
  recoverDiscardedWrite,
} from '@pear-notes/core/store/slices/activitySlice.js'
import { getSyncedDevices } from '@pear-notes/core/store/slices/syncedDevicesSlice.js'

import { useIsNoteUnlocked } from '@/lib/noteLock'
import {
  type ActivityEntry,
  buildActivityMessage,
  canExpandActivity,
  canRecoverActivity,
  formatActivityTime,
  getActivityDeviceName,
  isActivityHidden,
  isDiscardedActivity,
  isMobileActivityDevice,
} from '@/utils/activityUtils'

type ActivityDiff = {
  before: string
  after: string
  available: boolean
}

export function useActivityRow(entry: ActivityEntry, showTarget: boolean) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const devices = useSelector(getSyncedDevices) as any[]
  const diffs = useSelector(getActivityDiffs) as Record<string, ActivityDiff>
  const unlocked = useIsNoteUnlocked(entry.targetKey || null)

  const hidden = isActivityHidden(entry, unlocked)
  const canExpand = canExpandActivity(entry, hidden)
  const diff = diffs[entry.id] || null
  const isDiscarded = isDiscardedActivity(entry)
  const canRecover = canRecoverActivity(entry, hidden)
  const isRecovering = useSelector(getIsRecoveringWrite(entry.id)) as boolean

  const deviceName = useMemo(
    () => getActivityDeviceName(entry.device, devices, t),
    [entry.device, devices, t],
  )

  const isMobileDevice = useMemo(
    () => isMobileActivityDevice(entry.device, devices),
    [entry.device, devices],
  )

  const message = useMemo(
    () => buildActivityMessage(entry, t, hidden, showTarget),
    [entry, t, hidden, showTarget],
  )

  const timeLabel = useMemo(() => formatActivityTime(entry), [entry])

  const requestDiff = useCallback(() => {
    if (!diff) dispatch(fetchActivityDiff({ id: entry.id } as any))
  }, [diff, dispatch, entry.id])

  const recover = useCallback(() => {
    if (!canRecover || isRecovering) return
    dispatch(recoverDiscardedWrite({ id: entry.id } as any))
  }, [canRecover, isRecovering, dispatch, entry.id])

  return {
    hidden,
    canExpand,
    isDiscarded,
    canRecover,
    isRecovering,
    recover,
    diff,
    deviceName,
    isMobileDevice,
    message,
    timeLabel,
    requestDiff,
  }
}
