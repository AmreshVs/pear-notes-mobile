import {
  getAttachmentInfo as coreGetAttachmentInfo,
  getFirstImageUrl as coreGetFirstImageUrl,
  getPreview as coreGetPreview,
} from '@pear-notes/core/utils.js'

export type AttachmentKind = 'image' | 'video' | 'audio' | 'file' | 'mixed'

export interface AttachmentInfo {
  kind: AttachmentKind
  count: number
}

export function getAttachmentInfo(contentHtml?: string): AttachmentInfo | null {
  return coreGetAttachmentInfo(contentHtml) as AttachmentInfo | null
}

export function getFirstImageUrl(contentHtml?: string): string | null {
  return coreGetFirstImageUrl(contentHtml) as string | null
}

export function getPreview(content?: string, contentHtml?: string): string {
  return coreGetPreview(content, contentHtml)
}

export function isChecklistNote(html: string): boolean {
  return !!html && html.includes('data-type="taskItem"')
}
