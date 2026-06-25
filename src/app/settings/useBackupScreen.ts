import {
  getExportBuffer,
  getExportStatus,
  getImportStatus,
  resetExport,
  resetImport,
  startExportBackup,
  startImportBackup,
} from '@pear-notes/core/store/slices/backupSlice.js'
import {
  deleteNoteMedia,
  getNotesStorageInfo,
  getReclaimableBytes,
  getTotalBlobBytes,
  getTotalOnDiskBytes,
  selectStorageByKind,
  subscribeStorageInfo,
} from '@pear-notes/core/store/slices/storageSlice.js'
import { clearStorage, setNeedsReload } from '@pear-notes/core/store/slices/syncSlice.js'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Platform } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import {
  InvalidBackupFileError,
  pickAnyFilePath,
  pickBackupFilePath,
  saveBackupToDevice,
  saveBackupWithShare,
} from '@/lib/backupFileManager'
import { loadLastBackupDate, saveLastBackupDate } from '@/lib/backupUtils'

type BackupStatus = {
  step: string
  message: string
  progress: number
  current: number
  total: number
}

export function useBackupScreen() {
  const dispatch = useDispatch()
  const { t } = useTranslation()

  const exportStatus = useSelector(getExportStatus) as BackupStatus
  const importStatus = useSelector(getImportStatus) as BackupStatus
  const exportBuffer = useSelector(getExportBuffer) as any
  const totalBlobBytes = (useSelector(getTotalBlobBytes) as number) ?? 0
  const totalOnDiskBytes = (useSelector(getTotalOnDiskBytes) as number) ?? 0
  const reclaimableBytes = (useSelector(getReclaimableBytes) as number) ?? 0
  const notesStorageInfo = useSelector(getNotesStorageInfo) as any[]
  const buckets = useSelector(selectStorageByKind) as any

  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

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
    isExporting || isImporting || exportStatus.step === 'error' || importStatus.step === 'error'
  const isError = exportStatus.step === 'error' || importStatus.step === 'error'
  const errorMessage = exportStatus.step === 'error' ? exportStatus.message : importStatus.message
  const progressStatus = isExporting ? exportStatus : importStatus
  const isActive = exportStatus.step !== 'idle' || importStatus.step !== 'idle'

  const handleCreateBackup = useCallback(() => {
    dispatch(startExportBackup())
  }, [dispatch])

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

  const handleClearStorage = useCallback(() => {
    setConfirmClear(false)
    dispatch(clearStorage())
  }, [dispatch])

  const handleShowConfirmClear = useCallback(() => {
    setConfirmClear(true)
  }, [])

  const handleHideConfirmClear = useCallback(() => {
    setConfirmClear(false)
  }, [])

  const handleDeleteMedia = useCallback(
    (noteKey: string, mediaPath: string) => {
      dispatch(deleteNoteMedia({ noteKey, mediaPath } as any))
    },
    [dispatch],
  )

  const handleSaveBackup = useCallback(async () => {
    if (Platform.OS === 'ios') {
      try {
        await saveBackupWithShare(exportBuffer, t('backup.shareBackup'))
        await saveLastBackupDate()
        setLastBackupDate(new Date().toISOString())
        dispatch(resetExport())
      } catch (e) {
        Alert.alert(t('backup.shareError'), String(e))
      }
    } else {
      if (!exportBuffer) return
      try {
        await saveBackupToDevice(exportBuffer)
        await saveLastBackupDate()
        setLastBackupDate(new Date().toISOString())
      } catch {
      } finally {
        dispatch(resetExport())
      }
    }
  }, [exportBuffer, dispatch, t])

  useEffect(() => {
    if (exportStatus.step === 'done' && exportBuffer) {
      handleSaveBackup()
    }
  }, [exportStatus.step, exportBuffer, handleSaveBackup])

  const handleRestoreData = useCallback(async () => {
    if (Platform.OS === 'ios') {
      try {
        const filePath = await pickAnyFilePath()
        if (!filePath) return
        dispatch(startImportBackup({ filePath } as any))
      } catch (e) {
        Alert.alert(t('backup.restoreError'), String(e))
      }
    } else {
      try {
        const filePath = await pickBackupFilePath()
        if (!filePath) return
        dispatch(startImportBackup({ filePath } as any))
      } catch (e) {
        if (e instanceof InvalidBackupFileError) {
          Alert.alert(t('backup.invalidFile'), t('backup.invalidFileDesc'))
        } else {
          Alert.alert(t('backup.restoreError'), String(e))
        }
      }
    }
  }, [dispatch, t])

  const handleCancelOrDismiss = useCallback(() => {
    if (exportStatus.step !== 'idle') dispatch(resetExport())
    if (importStatus.step !== 'idle') dispatch(resetImport())
  }, [exportStatus.step, importStatus.step, dispatch])

  return {
    exportStatus,
    importStatus,
    exportBuffer,
    totalBlobBytes,
    totalOnDiskBytes,
    reclaimableBytes,
    notesStorageInfo,
    buckets,
    lastBackupDate,
    setLastBackupDate,
    confirmClear,
    isExporting,
    isImporting,
    showProgressModal,
    isError,
    errorMessage,
    progressStatus,
    isActive,
    handleCreateBackup,
    handleCancelExport,
    handleCancelImport,
    handleRestoreComplete,
    handleClearStorage,
    handleShowConfirmClear,
    handleHideConfirmClear,
    handleDeleteMedia,
    handleSaveBackup,
    handleRestoreData,
    handleCancelOrDismiss,
  }
}
