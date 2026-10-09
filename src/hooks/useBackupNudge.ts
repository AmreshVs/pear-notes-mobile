import { useCallback, useEffect, useState } from 'react'
import { Keyboard, Platform } from 'react-native'
import { useSelector } from 'react-redux'
import { router, usePathname } from 'expo-router'

import { getExportStatus, getImportStatus } from '@pear-notes/core/store/slices/backupSlice.js'
import {
  getIsLoading as getNotesLoading,
  getNotes,
} from '@pear-notes/core/store/slices/notesSlice.js'
import { getDevicesData, getDevicesKeys } from '@pear-notes/core/store/slices/syncedDevicesSlice.js'

import { BACKUP_NUDGE_GRACE_MS } from '@/constants/constants'
import { useAppUpdateNoticeVisible } from '@/lib/appUpdateNoticeVisibility'
import {
  isWithinNudgeInterval,
  loadBackupNudgeState,
  markBackupNudgeSheetSeen,
  snoozeBackupNudge,
} from '@/lib/backupNudge'
import type { BackupNudgeState } from '@/lib/backupNudge.types'

const BACKUP_ROUTE = '/settings/backup'
const DEVICES_ROUTE = '/settings/devices'
const HIDDEN_ROUTE_PREFIXES = ['/settings', '/note']
const IDLE_BACKUP_STEPS = ['idle', 'done', 'error']
const usesSheet = Platform.OS === 'ios'

export function useBackupNudge() {
  const pathname = usePathname()
  const notesLoading = useSelector(getNotesLoading)
  const notes = useSelector(getNotes) as { value: { addedAt?: number } }[]
  const deviceKeys = useSelector(getDevicesKeys) as string[]
  const devicesData = useSelector(getDevicesData) as Record<string, { isLocal?: boolean }>
  const exportStep = (useSelector(getExportStatus) as { step: string }).step
  const importStep = (useSelector(getImportStatus) as { step: string }).step
  const updateNoticeVisible = useAppUpdateNoticeVisible()
  const [keyboardVisible, setKeyboardVisible] = useState(false)

  const [state, setState] = useState<BackupNudgeState | null>(null)

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true))
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false))
    return () => {
      shown.remove()
      hidden.remove()
    }
  }, [])

  useEffect(() => {
    if (exportStep !== 'idle') return
    let cancelled = false
    loadBackupNudgeState().then((next) => {
      if (!cancelled) setState(next)
    })
    return () => {
      cancelled = true
    }
  }, [exportStep])

  const devicesKnown = deviceKeys.length > 0 && deviceKeys.every((key) => devicesData[key])
  const onlyDevice = devicesKnown && deviceKeys.every((key) => devicesData[key]?.isLocal === true)
  const backupIdle =
    IDLE_BACKUP_STEPS.includes(exportStep) && IDLE_BACKUP_STEPS.includes(importStep)
  const onMainScreen = !HIDDEN_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  const now = Date.now()
  const hasSettledNote = notes.some(
    (note) => (note.value.addedAt ?? now) <= now - BACKUP_NUDGE_GRACE_MS,
  )

  const eligible =
    !!state &&
    !notesLoading &&
    hasSettledNote &&
    !keyboardVisible &&
    !updateNoticeVisible &&
    onlyDevice &&
    backupIdle &&
    onMainScreen &&
    !isWithinNudgeInterval(state.lastBackupAt, now)

  const sheetVisible = eligible && usesSheet && !state.sheetSeen
  const bannerVisible =
    eligible &&
    !sheetVisible &&
    (!usesSheet || state.sheetSeen) &&
    !isWithinNudgeInterval(state.dismissedAt, now)

  const snooze = useCallback(() => {
    const at = Date.now()
    setState((prev) => (prev ? { ...prev, dismissedAt: at } : prev))
    snoozeBackupNudge(at)
  }, [])

  const closeSheet = useCallback(() => {
    const at = Date.now()
    setState((prev) => (prev ? { ...prev, sheetSeen: true, dismissedAt: at } : prev))
    markBackupNudgeSheetSeen()
    snoozeBackupNudge(at)
  }, [])

  const openBackup = useCallback(() => router.push(BACKUP_ROUTE), [])
  const openDevices = useCallback(() => router.push(DEVICES_ROUTE), [])

  return { sheetVisible, bannerVisible, snooze, closeSheet, openBackup, openDevices }
}
