import {
  getExportBuffer,
  getExportStatus,
  getImportStatus,
  resetExport,
  resetImport,
  setImportStatus,
  startExportBackup,
  startImportBackup,
} from '@pear-notes/core/store/slices/backupSlice.js'
import {
  getTotalBlobBytes,
  subscribeStorageInfo,
} from '@pear-notes/core/store/slices/storageSlice.js'
import { setNeedsReload } from '@pear-notes/core/store/slices/syncSlice.js'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Platform } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import {
  InvalidBackupFileError,
  pickAndReadBackupFile,
  saveBackupToDevice,
  saveBackupWithShare,
} from '@/lib/backupFileManager'
import { loadLastBackupDate, saveLastBackupDate } from '@/lib/backupUtils'
import { getDbEncryptionKey } from '@/lib/secureStore'
import { useToast } from '@/providers/ToastProvider'

type BackupStatus = {
  step: string
  message: string
  progress: number
  current: number
  total: number
}

function useBackupScreen() {
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [showExportConfirm, setShowExportConfirm] = useState(false)

  const exportStatus = useSelector(getExportStatus) as BackupStatus
  const importStatus = useSelector(getImportStatus) as BackupStatus
  const exportBuffer = useSelector(getExportBuffer) as any
  const totalBlobBytes = (useSelector(getTotalBlobBytes) as number) ?? 0

  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null)
  const [deviceRecoveryKey, setDeviceRecoveryKey] = useState<string | null>(null)
  const [showRecoveryModal, setShowRecoveryModal] = useState(false)
  const [selectedBackupBuffer, setSelectedBackupBuffer] = useState<Uint8Array | null>(null)

  useEffect(() => {
    dispatch(subscribeStorageInfo())
  }, [dispatch])

  useEffect(() => {
    loadLastBackupDate().then(setLastBackupDate)
  }, [])

  useEffect(() => {
    getDbEncryptionKey().then(setDeviceRecoveryKey)
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
    if (Platform.OS === 'android') {
      setShowExportConfirm(true)
    } else {
      Alert.alert(
        t('backup.confirmExportTitle'),
        t('backup.confirmExportDesc'),
        [
          { text: t('backup.confirmExportNo'), style: 'cancel' },
          { text: t('backup.confirmExportYes'), onPress: () => dispatch(startExportBackup()) },
        ],
        { cancelable: true },
      )
    }
  }, [dispatch, t])

  const handleConfirmExport = useCallback(() => {
    setShowExportConfirm(false)
    dispatch(startExportBackup())
  }, [dispatch])

  const handleDismissExportConfirm = useCallback(() => {
    setShowExportConfirm(false)
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
      } catch (e) {
        showToast(String(e))
      } finally {
        dispatch(resetExport())
      }
    }
  }, [exportBuffer, dispatch, showToast, t])

  useEffect(() => {
    if (exportStatus.step === 'done' && exportBuffer) {
      handleSaveBackup()
    }
  }, [exportStatus.step, exportBuffer, handleSaveBackup])

  const handleRestoreData = useCallback(async () => {
    try {
      const buffer = await pickAndReadBackupFile()
      if (!buffer) return
      setSelectedBackupBuffer(buffer)
      setShowRecoveryModal(true)
    } catch (e) {
      if (Platform.OS === 'android') {
        showToast(e instanceof InvalidBackupFileError ? t('backup.invalidFileDesc') : String(e))
      } else if (e instanceof InvalidBackupFileError) {
        Alert.alert(t('backup.invalidFile'), t('backup.invalidFileDesc'))
      } else {
        Alert.alert(t('backup.restoreError'), String(e))
      }
    }
  }, [showToast, t])

  const handleConfirmRestore = useCallback(
    async (enteredKey: string) => {
      setShowRecoveryModal(false)
      if (!selectedBackupBuffer) return
      setTimeout(() => {
        dispatch(
          setImportStatus({
            step: 'decrypting',
            progress: 15,
            message: t('backup.progress.restoringDesc'),
          }),
        )
        dispatch(
          startImportBackup({ buffer: selectedBackupBuffer, recoveryKey: enteredKey } as any),
        )
        setSelectedBackupBuffer(null)
      }, 350)
    },
    [dispatch, selectedBackupBuffer, t],
  )

  const handleCancelRecovery = useCallback(() => {
    setShowRecoveryModal(false)
    setSelectedBackupBuffer(null)
  }, [])

  const handleCancelOrDismiss = useCallback(() => {
    if (exportStatus.step !== 'idle') dispatch(resetExport())
    if (importStatus.step !== 'idle') dispatch(resetImport())
  }, [exportStatus.step, importStatus.step, dispatch])

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
    handleRestoreComplete,
    handleRestoreData,
    deviceRecoveryKey,
    showRecoveryModal,
    handleConfirmRestore,
    handleCancelRecovery,
    showExportConfirm,
    handleConfirmExport,
    handleDismissExportConfirm,
  }
}

export default useBackupScreen
