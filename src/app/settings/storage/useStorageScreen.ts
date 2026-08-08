import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

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
} from '@pear-notes/core/store/slices/storageSlice.js'
import { clearStorage } from '@pear-notes/core/store/slices/syncSlice.js'

import { clearStorageState } from '@/lib/clearStorageState'
import { hapticLight, hapticWarning } from '@/lib/haptics'
import { deleteDbEncryptionKey } from '@/lib/secureStore'

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

  const noteTitleByKey = useMemo(() => {
    const map: Record<string, string> = {}
    for (const note of notesStorageInfo) map[note.key] = note.title
    return map
  }, [notesStorageInfo])

  const [resetSheetVisible, setResetSheetVisible] = useState(false)

  useEffect(() => {
    dispatch(subscribeStorageInfo())
  }, [dispatch])

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
    deleteDbEncryptionKey().catch(console.error)
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
    buckets,
    resetSheetVisible,
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
