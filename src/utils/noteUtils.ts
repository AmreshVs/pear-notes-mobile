export type AttachmentKind = 'image' | 'video' | 'audio' | 'file' | 'mixed'

export interface AttachmentInfo {
  kind: AttachmentKind
  count: number
}

export { getAttachmentInfo, getFirstImageUrl, getPreview } from '@pear-notes/core/utils.js'

export function isChecklistNote(html: string): boolean {
  return !!html && html.includes('data-type="taskItem"')
}
