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
import { attachmentKey } from '@/utils/attachmentRows'
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
  const [opening, setOpening] = useState<string | null>(null)
  const busyRef = useRef(false)

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
        setOpening(null)
      }
    },
    [serverAddress, onError],
  )

  const preview = useCallback(
    (item: AttachmentItem) => {
      if (busyRef.current) return
      hapticLight()
      setOpening(attachmentKey(item))
      return run(item, (url, name) => previewAttachmentFile(url, name, () => setOpening(null)))
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

  const openNoteFor = useCallback((item: AttachmentItem) => openNote(item.noteKey), [openNote])

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
    opening,
    preview,
    handleMenu,
  }
}
