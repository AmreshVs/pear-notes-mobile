import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { router, usePathname } from 'expo-router'

import { getExportStatus, getImportStatus } from '@pear-notes/core/store/slices/backupSlice.js'

import { finishRestore } from '@/lib/backupActions'
import { isBackupServiceActive, stopBackupForegroundService } from '@/lib/backupBackgroundService'
import { clearImportCacheFile } from '@/lib/backupFileManager'

const isIOS = Platform.OS === 'ios'

export function useBackupProgressBanner() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const pathname = usePathname()

  const exportStatus = useSelector(getExportStatus) as any
  const importStatus = useSelector(getImportStatus) as any

  const isExporting =
    exportStatus.step !== 'idle' && exportStatus.step !== 'done' && exportStatus.step !== 'error'
  const isImporting =
    importStatus.step !== 'idle' && importStatus.step !== 'done' && importStatus.step !== 'error'
  const isExportComplete = exportStatus.step === 'done'
  const isImportComplete = importStatus.step === 'done'
  const isComplete = isExportComplete || isImportComplete

  const isActive = isExporting || isImporting
  const isBackupScreen = pathname === '/settings/backup'
  const isVisible = (isActive || isComplete) && !isBackupScreen

  const progressStatus = isExporting ? exportStatus : importStatus
  const message =
    progressStatus.message ||
    (isExporting ? t('backup.progress.backingUp') : t('backup.progress.restoring'))
  const completeTitle = isExportComplete
    ? t('backup.bannerReadyTitle')
    : t('backup.bannerRestoredTitle')
  const completeAction = isExportComplete
    ? t('backup.bannerReadyAction')
    : t('backup.bannerRestoredAction')

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isKeepAwake, setIsKeepAwake] = useState(isIOS)

  useEffect(() => {
    if (!isActive) setIsCollapsed(false)
  }, [isActive])

  useEffect(() => {
    if (importStatus.step === 'done' || importStatus.step === 'error') {
      clearImportCacheFile()
    }
  }, [importStatus.step])

  useEffect(() => {
    if (isActive || !isBackupServiceActive()) return
    if (isExportComplete) {
      stopBackupForegroundService(
        t('backup.notificationBackupComplete'),
        t('backup.notificationBackupCompleteDesc'),
      )
    } else if (isImportComplete) {
      stopBackupForegroundService(
        t('backup.notificationRestoreComplete'),
        t('backup.notificationRestoreCompleteDesc'),
      )
    } else {
      stopBackupForegroundService()
    }
  }, [isActive, isExportComplete, isImportComplete, t])

  useEffect(() => {
    if (isKeepAwake && isActive) {
      activateKeepAwakeAsync('backup-keep-awake')
    } else {
      deactivateKeepAwake('backup-keep-awake')
    }
    return () => {
      deactivateKeepAwake('backup-keep-awake')
    }
  }, [isKeepAwake, isActive])

  const handlePress = () => {
    if (isCollapsed) {
      setIsCollapsed(false)
    } else if (isImportComplete) {
      finishRestore(dispatch)
    } else {
      router.push('/settings/backup')
    }
  }

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  const toggleKeepAwake = () => {
    setIsKeepAwake(!isKeepAwake)
  }

  const isCollapsedCircle = isCollapsed && !isComplete
  const showCollapsedProgress = isCollapsedCircle && progressStatus.progress > 0

  return {
    t,
    isExporting,
    isComplete,
    isCollapsedCircle,
    showCollapsedProgress,
    progressStatus,
    message,
    completeTitle,
    completeAction,
    isCollapsed,
    isKeepAwake,
    isActive,
    isVisible,
    isIOS,
    handlePress,
    toggleCollapse,
    toggleKeepAwake,
  }
}
