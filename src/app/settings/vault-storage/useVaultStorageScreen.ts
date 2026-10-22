import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import { isMultiVaultEnabled } from '@pear-notes/core/constant.js'
import { getFolderKeys } from '@pear-notes/core/store/slices/foldersSlice.js'
import { getNoteKeys, getNotesData } from '@pear-notes/core/store/slices/notesSlice.js'
import {
  deleteNoteMedia,
  getActiveDownloads,
  getActiveUploads,
  getFilesWaitingToSeal,
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
  getVaults,
  removeVault,
} from '@pear-notes/core/store/slices/vaultsSlice.js'
import { formatDate } from '@pear-notes/core/utils.js'

import { resetAllData } from '@/lib/clearAllData'
import { hapticLight, hapticWarning } from '@/lib/haptics'
import { isNoteSessionUnlocked, markNoteUnlocked } from '@/lib/noteLock'
import { unlockLockedNotes } from '@/lib/noteLockSession'
import type { Vault } from '@/lib/vaults.types'
import { getNoteMetadata } from '@/utils/noteMetadata'

function useVaultStorageScreen() {
  const dispatch = useDispatch()

  const totalBlobBytes = (useSelector(getTotalBlobBytes) as number) ?? 0
  const totalOnDiskBytes = (useSelector(getTotalOnDiskBytes) as number) ?? 0
  const reclaimableBytes = (useSelector(getReclaimableBytes) as number) ?? 0
  const isReclaiming = (useSelector(getIsReclaiming) as boolean) ?? false
  const activeDownloads = useSelector(getActiveDownloads) as any[]
  const activeUploads = useSelector(getActiveUploads) as any[]
  const sealWaiting = useSelector(getFilesWaitingToSeal) as any[]
  const notesStorageInfo = useSelector(getNotesStorageInfo) as any[]
  const buckets = useSelector(selectStorageByKind) as any
  const { t } = useTranslation()
  const notesData = useSelector(getNotesData) as Record<string, any>
  const noteCount = (useSelector(getNoteKeys) as string[] | undefined)?.length ?? 0
  const folderCount = (useSelector(getFolderKeys) as string[] | undefined)?.length ?? 0
  const vaults = useSelector(getVaults) as Vault[]

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

  useEffect(() => {
    dispatch(subscribeStorageInfo())
    return () => {
      dispatch(unsubscribeStorageInfo())
    }
  }, [dispatch])

  const handleDeleteMedia = useCallback(
    async (noteKey: string, mediaPath: string) => {
      hapticWarning()
      const note = notesData[noteKey] as { sealed?: boolean; bodyOmitted?: boolean } | undefined
      if (note?.sealed && !isNoteSessionUnlocked()) {
        if (
          !(await unlockLockedNotes(t('noteLockPassword.deleteFileReason'), 'unlock', {
            fromSettings: true,
          }))
        )
          return
        markNoteUnlocked()
      }
      dispatch(deleteNoteMedia({ noteKey, mediaPath } as any))
    },
    [dispatch, notesData, t],
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
    sealWaiting,
    noteTitleByKey,
    notesStorageInfo,
    notesStorageRows,
    buckets,
    handleDeleteMedia,
    handleReclaim,
    handleRetryDownload,
    handlePauseDownload,
    multiVault: isMultiVaultEnabled(),
    hasMultipleVaults,
    currentVault,
    noteCount,
    folderCount,
    otherVaults: vaults.filter((vault) => !vault.current),
    clearVaultSheetVisible,
    handleClearVaultPress,
    handleClearVaultConfirm,
    handleClearVaultCancel,
  }
}

export default useVaultStorageScreen
