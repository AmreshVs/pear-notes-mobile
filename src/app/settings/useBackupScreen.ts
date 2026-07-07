import {
  getExportBuffer,
  getExportStatus,
  getImportStatus,
  resetExport,
  resetImport,
  setImportStatus,
} from '@pear-notes/core/store/slices/backupSlice.js'
import {
  getTotalBlobBytes,
  subscribeStorageInfo,
} from '@pear-notes/core/store/slices/storageSlice.js'
import { setNeedsReload } from '@pear-notes/core/store/slices/syncSlice.js'
import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Platform } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import {
  InvalidBackupFileError,
  getTempBackupFilePath,
  pickBackupFile,
  readBackupFile,
  saveBackupToDevice,
  saveBackupWithShare,
} from '@/lib/backupFileManager'
import { setPendingImportBuffer } from '@/lib/backupPasswordFlow'
import { loadLastBackupDate, saveLastBackupDate } from '@/lib/backupUtils'
import { useToast } from '@/providers/ToastProvider'

type BackupStatus = {
  step: string
  message: string
  progress: number
  current: number
  total: number
}

const MODAL_DISMISS_DELAY_MS = 450
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
  const exportBuffer = useSelector(getExportBuffer) as any
  const totalBlobBytes = (useSelector(getTotalBlobBytes) as number) ?? 0

  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null)
  const [hideModal, setHideModal] = useState(false)

  useEffect(() => {
    dispatch(subscribeStorageInfo())
  }, [dispatch])

  useEffect(() => {
    loadLastBackupDate().then(setLastBackupDate)
  }, [])

  const isExporting =
    exportStatus.step !== 'idle' && exportStatus.step !== 'done' && exportStatus.step !== 'error'
  const isImporting = importStatus.step !== 'idle' && importStatus.step !== 'error'
  const showProgressModal =
    !hideModal &&
    (isExporting || isImporting || exportStatus.step === 'error' || importStatus.step === 'error')
  const isError = exportStatus.step === 'error' || importStatus.step === 'error'
  const errorMessage = exportStatus.step === 'error' ? exportStatus.message : importStatus.message
  const progressStatus = isExporting ? exportStatus : importStatus
  const isActive = exportStatus.step !== 'idle' || importStatus.step !== 'idle'

  const handleCreateBackup = useCallback(() => {
    setHideModal(false)
    router.push(`${BACKUP_PASSWORD_ROUTE}?mode=create`)
  }, [])

  const handleRunInBackground = useCallback(() => {
    setHideModal(true)
  }, [])

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
    if (Platform.OS === 'ios') {
      try {
        await wait(MODAL_DISMISS_DELAY_MS)
        const filePath = getTempBackupFilePath()
        await saveBackupWithShare(filePath, t('backup.shareBackup'))
        await saveLastBackupDate()
        setLastBackupDate(new Date().toISOString())
        dispatch(resetExport())
      } catch (e) {
        Alert.alert(t('backup.shareError'), String(e))
      }
    } else {
      try {
        const filePath = getTempBackupFilePath()
        await saveBackupToDevice(filePath)
        await saveLastBackupDate()
        setLastBackupDate(new Date().toISOString())
      } catch (e) {
        showToast(String(e))
      } finally {
        dispatch(resetExport())
      }
    }
  }, [exportBuffer, dispatch, showToast, t])

  useEffect(() => {
    if (exportStatus.step === 'done') {
      setHideModal(false)
      handleSaveBackup()
    }
  }, [exportStatus.step, handleSaveBackup])

  const handleRestoreData = useCallback(async () => {
    try {
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
      const buffer = await readBackupFile(picked.uri)
      dispatch(resetImport())
      setPendingImportBuffer(buffer)
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
    errorMessage,
    progressStatus,
    isActive,
    handleCreateBackup,
    handleCancelExport,
    handleCancelImport,
    handleRunInBackground,
    handleRestoreComplete,
    handleRestoreData,
  }
}

export default useBackupScreen
