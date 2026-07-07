import {
  deleteNoteMedia,
  getNotesStorageInfo,
  getReclaimableBytes,
  getTotalBlobBytes,
  getTotalOnDiskBytes,
  selectStorageByKind,
  subscribeStorageInfo,
} from '@pear-notes/core/store/slices/storageSlice.js'
import { clearStorage } from '@pear-notes/core/store/slices/syncSlice.js'
import { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { clearStorageState } from '@/lib/clearStorageState'
import { deleteDbEncryptionKey } from '@/lib/secureStore'

function useStorageScreen() {
  const dispatch = useDispatch()

  const totalBlobBytes = (useSelector(getTotalBlobBytes) as number) ?? 0
  const totalOnDiskBytes = (useSelector(getTotalOnDiskBytes) as number) ?? 0
  const reclaimableBytes = (useSelector(getReclaimableBytes) as number) ?? 0
  const notesStorageInfo = useSelector(getNotesStorageInfo) as any[]
  const buckets = useSelector(selectStorageByKind) as any

  const [resetSheetVisible, setResetSheetVisible] = useState(false)

  useEffect(() => {
    dispatch(subscribeStorageInfo())
  }, [dispatch])

  const handleDeleteMedia = useCallback(
    (noteKey: string, mediaPath: string) => {
      dispatch(deleteNoteMedia({ noteKey, mediaPath } as any))
    },
    [dispatch],
  )

  const handleResetPress = useCallback(() => {
    setResetSheetVisible(true)
  }, [])

  const handleResetConfirm = useCallback(() => {
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
    notesStorageInfo,
    buckets,
    resetSheetVisible,
    handleDeleteMedia,
    handleResetPress,
    handleResetConfirm,
    handleResetCancel,
  }
}

export default useStorageScreen
