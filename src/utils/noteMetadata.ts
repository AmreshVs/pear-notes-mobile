import {
  type AttachmentInfo,
  getAttachmentInfo,
  getFirstImageUrl,
  getPreview,
  isChecklistNote,
} from '@/utils/noteUtils'

export interface NoteMetadata {
  preview: string
  attachment: AttachmentInfo | null
  imageUrl: string | null
  isChecklist: boolean
}

const EMPTY_METADATA: NoteMetadata = {
  preview: '',
  attachment: null,
  imageUrl: null,
  isChecklist: false,
}

const metadataCache = new WeakMap<object, NoteMetadata>()

export function getNoteMetadata(noteValue: any): NoteMetadata {
  if (!noteValue || typeof noteValue !== 'object') return EMPTY_METADATA

  const cached = metadataCache.get(noteValue)
  if (cached) return cached

  const html = noteValue.note || ''
  const metadata: NoteMetadata = {
    preview: getPreview(html),
    attachment: getAttachmentInfo(html),
    imageUrl: getFirstImageUrl(html),
    isChecklist: isChecklistNote(html),
  }

  metadataCache.set(noteValue, metadata)
  return metadata
}
