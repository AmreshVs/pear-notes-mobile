export type AttachmentKind = 'image' | 'video' | 'audio' | 'file' | 'mixed'

export interface AttachmentInfo {
  kind: AttachmentKind
  count: number
}

export { getPreview, getAttachmentInfo, getFirstImageUrl } from '@pear-notes/core/utils.js'

export function isChecklistNote(html: string): boolean {
  return !!html && html.includes('data-type="taskItem"')
}
