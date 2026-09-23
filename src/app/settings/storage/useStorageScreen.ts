import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { router } from 'expo-router'

import { LOCAL_AI_ENABLED } from '@pear-notes/core/store/services/localAiCatalog.js'
import {
  getLocalAiLoaded,
  initLocalAi,
  selectLocalAiBytesOnDisk,
} from '@pear-notes/core/store/slices/localAiSlice.js'
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
import { clearStorage } from '@pear-notes/core/store/slices/syncSlice.js'
import { formatDate } from '@pear-notes/core/utils.js'

import { clearCaches, measureCacheBytes } from '@/lib/cacheCleanup'
import { clearStorageState } from '@/lib/clearStorageState'
import { hapticLight, hapticWarning } from '@/lib/haptics'
import { clearVaultSecrets } from '@/lib/secureStore'
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

  const aiModelBytes = (useSelector(selectLocalAiBytesOnDisk) as number) ?? 0
  const localAiLoaded = useSelector(getLocalAiLoaded) as boolean

  useEffect(() => {
    if (LOCAL_AI_ENABLED && !localAiLoaded) dispatch(initLocalAi())
  }, [dispatch, localAiLoaded])

  const handleOpenAiModels = useCallback(() => {
    router.push('/settings/on-device-ai/models' as never)
  }, [])

  const [resetSheetVisible, setResetSheetVisible] = useState(false)
  const [cacheBytes, setCacheBytes] = useState(0)
  const [isClearingCache, setIsClearingCache] = useState(false)

  useEffect(() => {
    dispatch(subscribeStorageInfo())
    return () => {
      dispatch(unsubscribeStorageInfo())
    }
  }, [dispatch])

  useEffect(() => {
    let active = true
    measureCacheBytes().then((bytes) => {
      if (active) setCacheBytes(bytes)
    })
    return () => {
      active = false
    }
  }, [])

  const handleClearCache = useCallback(async () => {
    hapticLight()
    setIsClearingCache(true)
    try {
      await clearCaches()
      setCacheBytes(await measureCacheBytes())
    } finally {
      setIsClearingCache(false)
    }
  }, [])

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
    clearStorageState.setClearing(true)
    clearVaultSecrets().catch(console.error)
    dispatch(clearStorage())
  }, [dispatch])

  const handleResetCancel = useCallback(() => {
    setResetSheetVisible(false)
  }, [])

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
    cacheBytes,
    isClearingCache,
    handleClearCache,
    showAiModels: LOCAL_AI_ENABLED,
    aiModelBytes,
    handleOpenAiModels,
    handleDeleteMedia,
    handleReclaim,
    handleRetryDownload,
    handlePauseDownload,
    handleResetPress,
    handleResetConfirm,
    handleResetCancel,
  }
}

export default useStorageScreen
