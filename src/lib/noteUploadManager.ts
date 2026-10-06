import { AppState } from 'react-native'

import { backendApi } from '@pear-notes/core/backend/api.js'
import * as log from '@pear-notes/core/log.js'
import { getNoteData, updateNote } from '@pear-notes/core/store/slices/notesSlice.js'
import {
  getHyperdriveServerAddress,
  setHyperdriveServerAddress,
} from '@pear-notes/core/store/slices/uiSlice.js'
import { store } from '@pear-notes/core/store/store.js'

import {
  beginNoteUploadItem,
  completeNoteUploadItem,
  isNoteUploadItemCancelled,
  updateNoteUploadItemProgress,
} from '@/lib/uploadRegistry'
import { resolveHyperdriveUrl } from '@/utils/hyperdriveUrl'

const BLOB_SERVER_READY_TIMEOUT_MS = 5000

export class UploadCancelledError extends Error {
  constructor() {
    super('UPLOAD_CANCELLED')
    this.name = 'UploadCancelledError'
  }
}

export type StoredAttachment =
  | { type: 'image'; width: number; height: number }
  | { type: 'file'; fileSize: number; fileType: string }
  | { type: 'audio' }

function createProgressUpload(
  noteId: string,
  path: string,
  fileName: string,
  onProgress: (progress: number) => void,
) {
  const stream = backendApi.insertFileWithProgress({ key: noteId, fileName, path }) as any
  let cancelled = false
  const cancel = () => {
    cancelled = true
    if (typeof stream.destroy === 'function') stream.destroy()
  }
  const promise = (async () => {
    let link = ''
    let gotDone = false
    try {
      for await (const msg of stream) {
        if (cancelled) break
        if (msg.done) {
          link = msg.link
          gotDone = true
          continue
        }
        if (msg.total > 0) {
          onProgress(Math.min(100, Math.round((msg.transferred / msg.total) * 100)))
        }
      }
    } catch (e) {
      if (gotDone) return { link }
      if (cancelled) throw new UploadCancelledError()
      throw e
    }
    if (cancelled && !gotDone) throw new UploadCancelledError()
    return { link }
  })()
  return { promise, cancel }
}

export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildAttachmentHtml(link: string, attachment: StoredAttachment, fileName: string): string {
  const url = escapeHtml(link)
  if (attachment.type === 'image') {
    const width = attachment.width ? ` width="${Math.round(attachment.width)}"` : ''
    const height = attachment.height ? ` height="${Math.round(attachment.height)}"` : ''
    return `<img src="${url}"${width}${height}>`
  }
  if (attachment.type === 'audio') {
    return `<div data-audio-attachment="" url="${url}" fileName="${escapeHtml(fileName)}"></div>`
  }
  return `<div data-file-attachment="" url="${url}" fileName="${escapeHtml(fileName)}" fileSize="${attachment.fileSize || 0}" fileType="${escapeHtml(attachment.fileType || '')}"></div>`
}

export async function appendHtmlToStoredNote(noteId: string, html: string) {
  if (!html) return
  let note = getNoteData(noteId)(store.getState()) as
    | { title?: string; note?: string; bodyOmitted?: boolean }
    | undefined
  if (!note) return
  if (note.bodyOmitted) {
    const response = (await backendApi.getSingleNote({ key: noteId })) as {
      data?: { title?: string; note?: string; folderKey?: string }
    } | null
    if (!response?.data?.folderKey) {
      log.error('appendHtmlToStoredNote: could not read the note to append to', { noteId })
      return
    }
    note = response.data
  }
  store.dispatch(
    updateNote({ key: noteId, title: note.title || '', note: `${note.note || ''}${html}` } as any),
  )
}

function appendAttachmentToStoredNote(
  noteId: string,
  link: string,
  attachment: StoredAttachment,
  fileName: string,
) {
  appendHtmlToStoredNote(noteId, buildAttachmentHtml(link, attachment, fileName))
}

async function waitForBlobServer(): Promise<string | null> {
  if (AppState.currentState !== 'active') return null
  const timeout = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), BLOB_SERVER_READY_TIMEOUT_MS),
  )
  const ready = (async () => {
    try {
      const chore = (await backendApi.getChore()) as { hyperdriveServerAddress?: string } | null
      return chore?.hyperdriveServerAddress || null
    } catch {
      return null
    }
  })()
  const address = await Promise.race([ready, timeout])
  if (address && address !== getHyperdriveServerAddress(store.getState())) {
    store.dispatch(setHyperdriveServerAddress(address) as any)
  }
  return address
}

function resolveLiveLink(
  link: string,
  address: string | null,
  resolveLink: (link: string) => string,
): string {
  return (address && resolveHyperdriveUrl(link, address)) || resolveLink(link)
}

type RunNoteUploadOptions = {
  noteId: string
  itemId: string
  path: string
  fileName: string
  displayName: string
  attachment: StoredAttachment
  insertLive: (link: string) => void
  resolveLink: (link: string) => string
  isNoteOpen: () => boolean
  onError?: () => void
}

export async function runNoteUpload(options: RunNoteUploadOptions): Promise<void> {
  const {
    noteId,
    itemId,
    path,
    fileName,
    displayName,
    attachment,
    insertLive,
    resolveLink,
    isNoteOpen,
    onError,
  } = options

  if (isNoteUploadItemCancelled(itemId)) return

  const { promise, cancel } = createProgressUpload(noteId, path, fileName, (progress) =>
    updateNoteUploadItemProgress(noteId, itemId, progress),
  )
  beginNoteUploadItem(noteId, itemId, cancel)

  try {
    const { link } = await promise
    if (!link) return
    const address = isNoteOpen() ? await waitForBlobServer() : null
    if (isNoteOpen()) {
      insertLive(resolveLiveLink(link, address, resolveLink))
    } else {
      appendAttachmentToStoredNote(noteId, link, attachment, displayName)
    }
  } catch (e) {
    if (!(e instanceof UploadCancelledError)) onError?.()
  } finally {
    if (!isNoteUploadItemCancelled(itemId)) completeNoteUploadItem(noteId, itemId)
  }
}
