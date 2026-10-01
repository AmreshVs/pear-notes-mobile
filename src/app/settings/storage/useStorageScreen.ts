import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { router } from 'expo-router'

import { isMultiVaultEnabled } from '@pear-notes/core/constant.js'
import { LOCAL_AI_ENABLED } from '@pear-notes/core/store/services/localAiCatalog.js'
import { getLocalAiLoaded, initLocalAi } from '@pear-notes/core/store/slices/localAiSlice.js'
import { getNotesData } from '@pear-notes/core/store/slices/notesSlice.js'
import {
  deleteNoteMedia,
  getActiveDownloads,
  getActiveUploads,
  getIsReclaiming,
  getNotesStorageInfo,
  getReclaimableBytes,
  getTotalBlobBytes,
  getTotalOnDiskBytes,
  pauseDownload,
  reclaimStorage,
  retryDownload,
  selectStorageByKind,
  subscribeStorageInfo,
  unsubscribeStorageInfo,
} from '@pear-notes/core/store/slices/storageSlice.js'
import {
  getCurrentVault,
  getHasMultipleVaults,
  removeVault,
} from '@pear-notes/core/store/slices/vaultsSlice.js'
import { formatDate } from '@pear-notes/core/utils.js'

import { clearCaches } from '@/lib/cacheCleanup'
import { resetAllData } from '@/lib/clearAllData'
import {
  clearTemporaryFiles,
  deleteOldVaults,
  type DeviceStorageSummary,
  measureDeviceStorage,
} from '@/lib/deviceStorage'
import { hapticLight, hapticWarning } from '@/lib/haptics'
import type { Vault } from '@/lib/vaults.types'
import { getNoteMetadata } from '@/utils/noteMetadata'

function useStorageScreen() {
  const dispatch = useDispatch()

  const totalBlobBytes = (useSelector(getTotalBlobBytes) as number) ?? 0
  const totalOnDiskBytes = (useSelector(getTotalOnDiskBytes) as number) ?? 0
  const reclaimableBytes = (useSelector(getReclaimableBytes) as number) ?? 0
  const isReclaiming = (useSelector(getIsReclaiming) as boolean) ?? false
  const activeDownloads = useSelector(getActiveDownloads) as any[]
  const activeUploads = useSelector(getActiveUploads) as any[]
  const notesStorageInfo = useSelector(getNotesStorageInfo) as any[]
  const buckets = useSelector(selectStorageByKind) as any
  const notesData = useSelector(getNotesData) as Record<string, any>

  const noteTitleByKey = useMemo(() => {
    const map: Record<string, string> = {}
    for (const note of notesStorageInfo) map[note.key] = note.title
    return map
  }, [notesStorageInfo])

  const notesStorageRows = useMemo(
    () =>
      notesStorageInfo.map((note) => {
        if (note.title) return note
        const value = notesData[note.key]
        const preview = value ? getNoteMetadata(value).preview.trim() : ''
        const timestamp = value?.updatedAt || value?.createdAt
        const parts = [preview, timestamp ? formatDate(timestamp) : ''].filter(Boolean)
        return { ...note, subtitle: parts.join(' · ') }
      }),
    [notesStorageInfo, notesData],
  )

  const localAiLoaded = useSelector(getLocalAiLoaded) as boolean

  useEffect(() => {
    if (LOCAL_AI_ENABLED && !localAiLoaded) dispatch(initLocalAi())
  }, [dispatch, localAiLoaded])

  const handleOpenAiModels = useCallback(() => {
    router.push('/settings/on-device-ai/models' as never)
  }, [])

  const [resetSheetVisible, setResetSheetVisible] = useState(false)
  const [isClearingCache, setIsClearingCache] = useState(false)
  const [deviceStorage, setDeviceStorage] = useState<DeviceStorageSummary | null>(null)
  const [isDeletingOldVaults, setIsDeletingOldVaults] = useState(false)

  const refreshDeviceStorage = useCallback(async () => {
    const summary = await measureDeviceStorage().catch(() => null)
    if (summary) setDeviceStorage(summary)
  }, [])

  useEffect(() => {
    dispatch(subscribeStorageInfo())
    return () => {
      dispatch(unsubscribeStorageInfo())
    }
  }, [dispatch])

  useEffect(() => {
    refreshDeviceStorage()
  }, [refreshDeviceStorage])

  useEffect(() => {
    if (!isReclaiming) refreshDeviceStorage()
  }, [isReclaiming, refreshDeviceStorage])

  const handleClearCache = useCallback(async () => {
    hapticLight()
    setIsClearingCache(true)
    try {
      await clearCaches()
      await clearTemporaryFiles()
      await refreshDeviceStorage()
    } finally {
      setIsClearingCache(false)
    }
  }, [refreshDeviceStorage])

  const handleDeleteOldVaults = useCallback(async () => {
    hapticWarning()
    setIsDeletingOldVaults(true)
    try {
      await deleteOldVaults()
      await refreshDeviceStorage()
    } finally {
      setIsDeletingOldVaults(false)
    }
  }, [refreshDeviceStorage])

  const handleDeleteMedia = useCallback(
    (noteKey: string, mediaPath: string) => {
      hapticWarning()
      dispatch(deleteNoteMedia({ noteKey, mediaPath } as any))
    },
    [dispatch],
  )

  const handleReclaim = useCallback(() => {
    hapticLight()
    dispatch(reclaimStorage())
  }, [dispatch])

  const handleRetryDownload = useCallback(
    (url: string) => {
      hapticLight()
      dispatch(retryDownload({ url } as any))
    },
    [dispatch],
  )

  const handlePauseDownload = useCallback(
    (url: string) => {
      hapticLight()
      dispatch(pauseDownload({ url } as any))
    },
    [dispatch],
  )

  const handleResetPress = useCallback(() => {
    hapticLight()
    setResetSheetVisible(true)
  }, [])

  const handleResetConfirm = useCallback(() => {
    hapticWarning()
    setResetSheetVisible(false)
    resetAllData(dispatch)
  }, [dispatch])

  const handleResetCancel = useCallback(() => {
    setResetSheetVisible(false)
  }, [])

  const hasMultipleVaults = useSelector(getHasMultipleVaults) as boolean
  const currentVault = useSelector(getCurrentVault) as Vault | null
  const [clearVaultSheetVisible, setClearVaultSheetVisible] = useState(false)

  const handleClearVaultPress = useCallback(() => {
    hapticLight()
    setClearVaultSheetVisible(true)
  }, [])

  const handleClearVaultConfirm = useCallback(() => {
    hapticWarning()
    setClearVaultSheetVisible(false)
    if (hasMultipleVaults && currentVault) dispatch(removeVault({ id: currentVault.id }))
    else resetAllData(dispatch)
  }, [currentVault, dispatch, hasMultipleVaults])

  const handleClearVaultCancel = useCallback(() => setClearVaultSheetVisible(false), [])

  return {
    totalBlobBytes,
    totalOnDiskBytes,
    reclaimableBytes,
    isReclaiming,
    activeDownloads,
    activeUploads,
    noteTitleByKey,
    notesStorageInfo,
    notesStorageRows,
    buckets,
    resetSheetVisible,
    isClearingCache,
    handleClearCache,
    showAiModels: LOCAL_AI_ENABLED,
    deviceStorage,
    isDeletingOldVaults,
    handleDeleteOldVaults,
    handleOpenAiModels,
    handleDeleteMedia,
    handleReclaim,
    handleRetryDownload,
    handlePauseDownload,
    handleResetPress,
    multiVault: isMultiVaultEnabled(),
    hasMultipleVaults,
    currentVault,
    clearVaultSheetVisible,
    handleClearVaultPress,
    handleClearVaultConfirm,
    handleClearVaultCancel,
    handleResetConfirm,
    handleResetCancel,
  }
}

export default useStorageScreen
