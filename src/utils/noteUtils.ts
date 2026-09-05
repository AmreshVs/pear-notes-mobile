import {
  getAttachmentInfo as coreGetAttachmentInfo,
  getFirstImageUrl as coreGetFirstImageUrl,
  getFirstPdfAttachment as coreGetFirstPdfAttachment,
  getImageAttachments as coreGetImageAttachments,
  getPdfAttachments as coreGetPdfAttachments,
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

export interface PdfAttachmentRef {
  url: string
  fileName: string
}

export function getFirstPdfAttachment(contentHtml?: string): PdfAttachmentRef | null {
  return coreGetFirstPdfAttachment(contentHtml) as PdfAttachmentRef | null
}

export function getPdfAttachments(contentHtml?: string): PdfAttachmentRef[] {
  return coreGetPdfAttachments(contentHtml) as PdfAttachmentRef[]
}

export function getImageAttachments(contentHtml?: string): string[] {
  return coreGetImageAttachments(contentHtml) as string[]
}

export function getPreview(content?: string, contentHtml?: string): string {
  return coreGetPreview(content, contentHtml)
}

export function isChecklistNote(html: string): boolean {
  return !!html && html.includes('data-type="taskItem"')
}
