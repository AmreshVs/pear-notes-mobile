import { getNoteSummary } from '@pear-notes/core/utils.js'

import type { AttachmentInfo, PdfAttachmentRef } from '@/utils/noteUtils'

export interface NoteMetadata {
  preview: string
  attachment: AttachmentInfo | null
  imageUrl: string | null
  pdf: PdfAttachmentRef | null
  isChecklist: boolean
}

const EMPTY_METADATA: NoteMetadata = {
  preview: '',
  attachment: null,
  imageUrl: null,
  pdf: null,
  isChecklist: false,
}

const metadataCache = new WeakMap<object, NoteMetadata>()
const internedMetadata = new Map<string, NoteMetadata>()
const MAX_INTERNED_METADATA = 1000

function internMetadata(metadata: NoteMetadata): NoteMetadata {
  const signature = JSON.stringify([
    metadata.preview,
    metadata.attachment?.kind,
    metadata.attachment?.count,
    metadata.imageUrl,
    metadata.pdf?.url,
    metadata.pdf?.fileName,
    metadata.isChecklist,
  ])
  const existing = internedMetadata.get(signature)
  if (existing) return existing
  if (internedMetadata.size >= MAX_INTERNED_METADATA) internedMetadata.clear()
  internedMetadata.set(signature, metadata)
  return metadata
}

export function getNoteMetadata(noteValue: any): NoteMetadata {
  if (!noteValue || typeof noteValue !== 'object') return EMPTY_METADATA

  const cached = metadataCache.get(noteValue)
  if (cached) return cached

  const summary = getNoteSummary(noteValue) as any
  const metadata: NoteMetadata = {
    preview: summary.preview || '',
    attachment: summary.attachment || null,
    imageUrl: summary.imageUrl || null,
    pdf: summary.pdfs?.[0] || null,
    isChecklist: summary.isChecklist === true,
  }

  const interned = internMetadata(metadata)
  metadataCache.set(noteValue, interned)
  return interned
}

const ROW_FIELDS = ['title', 'updatedAt', 'createdAt', 'pinned', 'locked'] as const

export function isSameNoteRow(a: any, b: any): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return (
    ROW_FIELDS.every((field) => a[field] === b[field]) && getNoteMetadata(a) === getNoteMetadata(b)
  )
}
