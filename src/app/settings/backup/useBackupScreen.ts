import {
  getExportStatus,
  getImportStatus,
  resetExport,
  resetImport,
  setImportStatus,
} from '@pear-notes/core/store/slices/backupSlice.js'
import { getNotes } from '@pear-notes/core/store/slices/notesSlice.js'
import { getLockMethod } from '@pear-notes/core/store/slices/settingsSlice.js'
import {
  getTotalBlobBytes,
  subscribeStorageInfo,
} from '@pear-notes/core/store/slices/storageSlice.js'
import { setNeedsReload } from '@pear-notes/core/store/slices/syncSlice.js'
import * as ExpoBackgroundService from 'expo-background-service'
import { router } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, PermissionsAndroid, Platform } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import {
  InvalidBackupFileError,
  backupUriToPath,
  clearImportCacheFile,
  getTempBackupFilePath,
  pickBackupFile,
  rememberImportCacheFile,
  saveBackupToDevice,
  saveBackupWithShare,
} from '@/lib/backupFileManager'
import { setPendingImportPath } from '@/lib/backupPasswordFlow'
import { loadLastBackupDate, saveLastBackupDate } from '@/lib/backupUtils'
import { authenticateWithLockMethod } from '@/lib/noteLockActions'
import { useToast } from '@/providers/ToastProvider'

type BackupStatus = {
  step: string
  message: string
  progress: number
  current: number
  total: number
}

const MODAL_DISMISS_DELAY_MS = 450
const SUCCESS_VISIBLE_MS = 900
const BACKUP_PASSWORD_ROUTE = '/settings/backup-password'

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function useBackupScreen() {
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const { showToast } = useToast()

  const exportStatus = useSelector(getExportStatus) as BackupStatus
  const importStatus = useSelector(getImportStatus) as BackupStatus
  const totalBlobBytes = (useSelector(getTotalBlobBytes) as number) ?? 0
  const notes = useSelector(getNotes) as { value?: { locked?: boolean } }[]
  const lockMethod = useSelector(getLockMethod) as string
  const hasLockedNotes = notes.some((note) => note.value?.locked === true)

  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null)
  const [hideModal, setHideModal] = useState(false)
  const [isForegroundServiceActive, setIsForegroundServiceActive] = useState(false)
  const savingRef = useRef(false)

  useEffect(() => {
    dispatch(subscribeStorageInfo())
  }, [dispatch])

  useEffect(() => {
    loadLastBackupDate().then(setLastBackupDate)
  }, [])

  const isExporting =
    exportStatus.step !== 'idle' && exportStatus.step !== 'done' && exportStatus.step !== 'error'
  const isImporting = importStatus.step !== 'idle' && importStatus.step !== 'error'
  const isExportDone = exportStatus.step === 'done'
  const isImportDone = importStatus.step === 'done'
  const isError = exportStatus.step === 'error' || importStatus.step === 'error'
  const showProgressModal = !hideModal && (isExporting || isImporting || isExportDone || isError)
  const errorMessage = exportStatus.step === 'error' ? exportStatus.message : importStatus.message
  const progressStatus = exportStatus.step !== 'idle' ? exportStatus : importStatus
  const isActive = exportStatus.step !== 'idle' || importStatus.step !== 'idle'

  useEffect(() => {
    if (isError) setHideModal(false)
  }, [isError])

  const handleDismissProgress = useCallback(() => {
    dispatch(resetExport())
    dispatch(resetImport())
  }, [dispatch])

  useEffect(() => {
    if (isForegroundServiceActive) {
      if (isActive) {
        ExpoBackgroundService.updateService(progressStatus.progress, progressStatus.message, 100)
      } else {
        ExpoBackgroundService.stopService()
        setIsForegroundServiceActive(false)
      }
    }
  }, [isForegroundServiceActive, isActive, progressStatus.progress, progressStatus.message])

  const handleCreateBackup = useCallback(async () => {
    if (hasLockedNotes) {
      const ok = await authenticateWithLockMethod(t('backup.lockedAuthReason'), lockMethod)
      if (!ok) return
    }
    setHideModal(false)
    router.push(`${BACKUP_PASSWORD_ROUTE}?mode=create`)
  }, [hasLockedNotes, lockMethod, t])

  const handleRunInBackground = useCallback(async () => {
    setHideModal(true)
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: t('backup.notificationPermissionTitle'),
            message: t('backup.notificationPermissionDesc'),
            buttonNeutral: t('backup.notificationPermissionAskMeLater'),
            buttonNegative: t('backup.notificationPermissionCancel'),
            buttonPositive: t('backup.notificationPermissionOK'),
          },
        )
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          ExpoBackgroundService.startService(
            isExporting ? t('backup.title') : t('backup.restoreTitle'),
            progressStatus.message,
            100,
          )
          setIsForegroundServiceActive(true)
        }
      } catch (err) {
        console.warn(err)
      }
    }
  }, [t, isExporting, progressStatus.message])

  const handleCancelExport = useCallback(() => {
    dispatch(resetExport())
  }, [dispatch])

  const handleCancelImport = useCallback(() => {
    dispatch(resetImport())
  }, [dispatch])

  const handleRestoreComplete = useCallback(() => {
    dispatch(resetImport())
    dispatch(setNeedsReload(true))
  }, [dispatch])

  const handleSaveBackup = useCallback(async () => {
    await wait(SUCCESS_VISIBLE_MS)
    setHideModal(true)
    if (Platform.OS === 'ios') {
      try {
        await wait(MODAL_DISMISS_DELAY_MS)
        await saveBackupWithShare(getTempBackupFilePath(), t('backup.shareBackup'))
        await saveLastBackupDate()
        setLastBackupDate(new Date().toISOString())
        dispatch(resetExport())
      } catch (e) {
        dispatch(resetExport())
        Alert.alert(t('backup.shareError'), String(e))
      }
    } else {
      try {
        await saveBackupToDevice(getTempBackupFilePath())
        await saveLastBackupDate()
        setLastBackupDate(new Date().toISOString())
      } catch (e) {
        showToast(String(e))
      } finally {
        dispatch(resetExport())
      }
    }
  }, [dispatch, showToast, t])

  useEffect(() => {
    if (exportStatus.step === 'done' && !savingRef.current) {
      savingRef.current = true
      setHideModal(false)
      handleSaveBackup().finally(() => {
        savingRef.current = false
      })
    }
  }, [exportStatus.step, handleSaveBackup])

  const handleRestoreData = useCallback(async () => {
    try {
      clearImportCacheFile()
      const picked = await pickBackupFile()
      if (!picked) return
      setHideModal(false)
      dispatch(
        setImportStatus({
          step: 'reading',
          progress: 5,
          message: t('backup.progress.readingDesc'),
          current: 0,
          total: 0,
        }),
      )
      dispatch(resetImport())
      const importPath = backupUriToPath(picked.uri)
      rememberImportCacheFile(importPath)
      setPendingImportPath(importPath)
      router.push(`${BACKUP_PASSWORD_ROUTE}?mode=enter`)
    } catch (e) {
      dispatch(resetImport())
      if (Platform.OS === 'android') {
        showToast(e instanceof InvalidBackupFileError ? t('backup.invalidFileDesc') : String(e))
      } else if (e instanceof InvalidBackupFileError) {
        Alert.alert(t('backup.invalidFile'), t('backup.invalidFileDesc'))
      } else {
        Alert.alert(t('backup.restoreError'), String(e))
      }
    }
  }, [dispatch, showToast, t])

  return {
    importStatus,
    totalBlobBytes,
    lastBackupDate,
    isExporting,
    showProgressModal,
    isError,
    isExportDone,
    isImportDone,
    errorMessage,
    progressStatus,
    isActive,
    handleCreateBackup,
    handleCancelExport,
    handleCancelImport,
    handleDismissProgress,
    handleRunInBackground,
    handleRestoreComplete,
    handleRestoreData,
  }
}

export default useBackupScreen
