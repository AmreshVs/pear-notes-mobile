import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Platform } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { router } from 'expo-router'

import {
  cancelExportBackup,
  cancelImportBackup,
  getExportStatus,
  getImportStatus,
  resetExport,
  resetImport,
  setImportStatus,
} from '@pear-notes/core/store/slices/backupSlice.js'
import { getNotes } from '@pear-notes/core/store/slices/notesSlice.js'
import {
  getTotalBlobBytes,
  subscribeStorageInfo,
  unsubscribeStorageInfo,
} from '@pear-notes/core/store/slices/storageSlice.js'

import { finishRestore } from '@/lib/backupActions'
import {
  startBackupForegroundService,
  stopBackupForegroundService,
  updateBackupForegroundService,
} from '@/lib/backupBackgroundService'
import {
  backupUriToPath,
  clearBackupExportCache,
  clearImportCacheFile,
  EmptyBackupFileError,
  getBackupExportPath,
  InvalidBackupFileError,
  pickBackupFile,
  rememberImportCacheFile,
  saveBackupToDevice,
  saveBackupWithShare,
} from '@/lib/backupFileManager'
import { setPendingImportPath } from '@/lib/backupPasswordFlow'
import { loadLastBackupDate, saveLastBackupDate } from '@/lib/backupUtils'
import { hapticError, hapticSuccess } from '@/lib/haptics'
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
  const hasLockedNotes = notes.some((note) => note.value?.locked === true)

  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null)
  const [hideModal, setHideModal] = useState(false)
  const [isForegroundServiceActive, setIsForegroundServiceActive] = useState(false)
  const savingRef = useRef(false)

  useEffect(() => {
    dispatch(subscribeStorageInfo())
    return () => {
      dispatch(unsubscribeStorageInfo())
    }
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
    if (isError || isImportDone) setHideModal(false)
  }, [isError, isImportDone])

  useEffect(() => {
    if (isError) hapticError()
  }, [isError])

  useEffect(() => {
    if (isExportDone || isImportDone) hapticSuccess()
  }, [isExportDone, isImportDone])

  useEffect(() => {
    if (exportStatus.step === 'error') clearBackupExportCache(getBackupExportPath())
  }, [exportStatus.step])

  const handleDismissProgress = useCallback(() => {
    dispatch(resetExport())
    dispatch(resetImport())
  }, [dispatch])

  const backgroundServiceTitle =
    exportStatus.step !== 'idle'
      ? t('backup.progress.creatingTitle')
      : t('backup.progress.restoringTitle')

  useEffect(() => {
    if (!isForegroundServiceActive) return
    if (isActive) {
      updateBackupForegroundService(
        backgroundServiceTitle,
        progressStatus.progress,
        progressStatus.message,
      )
    } else {
      stopBackupForegroundService()
      setIsForegroundServiceActive(false)
    }
  }, [
    isForegroundServiceActive,
    isActive,
    backgroundServiceTitle,
    progressStatus.progress,
    progressStatus.message,
  ])

  const handleCreateBackup = useCallback(async () => {
    if (hasLockedNotes) {
      const ok = await authenticateWithLockMethod(t('backup.lockedAuthReason'))
      if (!ok) return
    }
    setHideModal(false)
    router.push(`${BACKUP_PASSWORD_ROUTE}?mode=create`)
  }, [hasLockedNotes, t])

  const handleRunInBackground = useCallback(async () => {
    setHideModal(true)
    const started = await startBackupForegroundService(
      backgroundServiceTitle,
      progressStatus.message,
      {
        title: t('backup.notificationPermissionTitle'),
        message: t('backup.notificationPermissionDesc'),
        buttonNeutral: t('backup.notificationPermissionAskMeLater'),
        buttonNegative: t('backup.notificationPermissionCancel'),
        buttonPositive: t('backup.notificationPermissionOK'),
      },
    )
    setIsForegroundServiceActive(started)
  }, [t, backgroundServiceTitle, progressStatus.message])

  const handleCancelExport = useCallback(() => {
    dispatch(cancelExportBackup())
    dispatch(resetExport())
    clearBackupExportCache(getBackupExportPath())
  }, [dispatch])

  const handleCancelImport = useCallback(() => {
    dispatch(cancelImportBackup())
    dispatch(resetImport())
  }, [dispatch])

  const handleRestoreComplete = useCallback(() => {
    finishRestore(dispatch)
  }, [dispatch])

  const getSaveErrorMessage = useCallback(
    (e: unknown) => (e instanceof EmptyBackupFileError ? t('backup.emptyFileDesc') : String(e)),
    [t],
  )

  const handleSaveBackup = useCallback(async () => {
    await wait(SUCCESS_VISIBLE_MS)
    setHideModal(true)
    if (Platform.OS === 'ios') {
      try {
        await wait(MODAL_DISMISS_DELAY_MS)
        const saved = await saveBackupWithShare(getBackupExportPath(), t('backup.shareBackup'))
        if (saved) {
          await saveLastBackupDate()
          setLastBackupDate(new Date().toISOString())
        }
        dispatch(resetExport())
      } catch (e) {
        console.error('handleSaveBackup', e)
        dispatch(resetExport())
        Alert.alert(t('backup.shareError'), getSaveErrorMessage(e))
      }
    } else {
      try {
        const saved = await saveBackupToDevice(getBackupExportPath())
        if (saved) {
          await saveLastBackupDate()
          setLastBackupDate(new Date().toISOString())
        }
      } catch (e) {
        console.error('handleSaveBackup else', e)
        showToast(getSaveErrorMessage(e))
      } finally {
        dispatch(resetExport())
      }
    }
  }, [dispatch, getSaveErrorMessage, showToast, t])

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
