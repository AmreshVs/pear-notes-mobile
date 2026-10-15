import { useCallback, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import * as Clipboard from 'expo-clipboard'

import { getHyperdriveServerAddress } from '@pear-notes/core/store/slices/uiSlice.js'

import type { AttachmentItem } from '@/components/attachments/attachments.types'
import {
  previewAttachmentFile,
  saveAttachmentFile,
  shareAttachmentFile,
} from '@/lib/attachmentActions'
import { hapticLight, hapticSuccess } from '@/lib/haptics'
import { useNoteEditor } from '@/providers/NoteEditorContext'
import { resolveHyperdriveUrl } from '@/utils/hyperdriveUrl'

export const ATTACHMENT_MENU = {
  openNote: 'openNote',
  share: 'share',
  save: 'save',
  copyName: 'copyName',
} as const

const downloadName = (item: AttachmentItem) => item.fileName || `${item.kind}-${item.updatedAt}`

export function useAttachmentActions(onError: () => void) {
  const { openNote } = useNoteEditor()
  const serverAddress = useSelector(getHyperdriveServerAddress)
  const [selected, setSelected] = useState<AttachmentItem | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const busyRef = useRef(false)
  const pendingNoteRef = useRef<string | null>(null)

  const run = useCallback(
    async (item: AttachmentItem, work: (url: string, name: string) => Promise<unknown>) => {
      const url = resolveHyperdriveUrl(item.url, serverAddress)
      if (busyRef.current || !url) return
      busyRef.current = true
      try {
        await work(url, downloadName(item))
      } catch {
        onError()
      } finally {
        busyRef.current = false
        setProgress(null)
      }
    },
    [serverAddress, onError],
  )

  const preview = useCallback(
    (item: AttachmentItem) => {
      hapticLight()
      setProgress(0)
      return run(item, (url, name) => previewAttachmentFile(url, name, setProgress))
    },
    [run],
  )

  const share = useCallback(
    (item: AttachmentItem) => run(item, (url, name) => shareAttachmentFile(url, name)),
    [run],
  )

  const save = useCallback(
    (item: AttachmentItem) =>
      run(item, async (url, name) => {
        await saveAttachmentFile(item.kind, url, name)
        hapticSuccess()
      }),
    [run],
  )

  const copyName = useCallback((item: AttachmentItem) => {
    if (item.fileName) Clipboard.setStringAsync(item.fileName)
  }, [])

  const openNoteFor = useCallback(
    (item: AttachmentItem) => {
      setSelected(null)
      openNote(item.noteKey)
    },
    [openNote],
  )

  const openNoteFromSheet = useCallback((item: AttachmentItem) => {
    pendingNoteRef.current = item.noteKey
    setSelected(null)
  }, [])

  const handleSheetDismissed = useCallback(() => {
    const noteKey = pendingNoteRef.current
    pendingNoteRef.current = null
    if (noteKey) openNote(noteKey)
  }, [openNote])

  const closeSheet = useCallback(() => setSelected(null), [])

  const handleMenu = useCallback(
    (item: AttachmentItem, id: string) => {
      if (id === ATTACHMENT_MENU.openNote) openNoteFor(item)
      else if (id === ATTACHMENT_MENU.share) share(item)
      else if (id === ATTACHMENT_MENU.save) save(item)
      else if (id === ATTACHMENT_MENU.copyName) copyName(item)
    },
    [openNoteFor, share, save, copyName],
  )

  return {
    selected,
    select: setSelected,
    closeSheet,
    progress,
    preview,
    share,
    save,
    openNoteFor,
    openNoteFromSheet,
    handleSheetDismissed,
    handleMenu,
  }
}
