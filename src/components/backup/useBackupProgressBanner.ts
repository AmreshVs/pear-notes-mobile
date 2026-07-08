import { getExportStatus, getImportStatus } from '@pear-notes/core/store/slices/backupSlice.js'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { router, usePathname } from 'expo-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform } from 'react-native'
import { useSelector } from 'react-redux'

import { clearImportCacheFile } from '@/lib/backupFileManager'

const isIOS = Platform.OS === 'ios'

export function useBackupProgressBanner() {
  const { t } = useTranslation()
  const pathname = usePathname()

  const exportStatus = useSelector(getExportStatus) as any
  const importStatus = useSelector(getImportStatus) as any

  const isExporting =
    exportStatus.step !== 'idle' && exportStatus.step !== 'done' && exportStatus.step !== 'error'
  const isImporting = importStatus.step !== 'idle' && importStatus.step !== 'error'
  const isExportComplete = exportStatus.step === 'done'

  const isActive = isExporting || isImporting
  const isBackupScreen = pathname === '/settings/backup'
  const isVisible = (isActive || isExportComplete) && !isBackupScreen

  const progressStatus = isExporting ? exportStatus : importStatus
  const message =
    progressStatus.message ||
    (isExporting ? t('backup.progress.backingUp') : t('backup.progress.restoring'))

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

  return {
    t,
    isExporting,
    isExportComplete,
    progressStatus,
    message,
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
