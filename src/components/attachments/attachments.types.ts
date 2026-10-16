export type AttachmentKind = 'photo' | 'pdf' | 'audio' | 'file'

export type AttachmentGroupBy = 'folder' | 'type' | 'month'

export type AttachmentFilter = 'all' | AttachmentKind

export type AttachmentItem = {
  kind: AttachmentKind
  url: string
  fileName: string
  fileType: string
  size: number
  duration: number
  noteKey: string
  title: string
  folderKey: string
  updatedAt: number
  local?: boolean
}

export type AttachmentSection = {
  key: string
  photos: AttachmentItem[]
  files: AttachmentItem[]
  count: number
}

export type GroupedAttachments = {
  total: number
  bytes: number
  missing: number
  counts: Record<AttachmentFilter, number>
  sections: AttachmentSection[]
}

export type AttachmentHeaderRow = {
  type: 'header'
  key: string
  section: AttachmentSection
  expanded: boolean
  collapsible: boolean
}

export type AttachmentPhotosRow = {
  type: 'photos'
  key: string
  items: AttachmentItem[]
  last: boolean
  filesFollow: boolean
}

export type AttachmentFileRow = {
  type: 'file'
  key: string
  item: AttachmentItem
  first: boolean
  last: boolean
}

export type AttachmentListRow = AttachmentHeaderRow | AttachmentPhotosRow | AttachmentFileRow
