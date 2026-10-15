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
