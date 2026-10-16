import type {
  AttachmentItem,
  AttachmentListRow,
  AttachmentSection,
} from '@/components/attachments/attachments.types'

export const PHOTO_COLUMNS = 4
export const COLLAPSED_FILES = 2

export const attachmentKey = (item: AttachmentItem) => `${item.noteKey}|${item.url}`

const sectionKey = (section: AttachmentSection) => section.key || 'unfiled'

function pushPhotoRows(
  rows: AttachmentListRow[],
  key: string,
  photos: AttachmentItem[],
  filesFollow: boolean,
) {
  for (let start = 0; start < photos.length; start += PHOTO_COLUMNS) {
    const items = photos.slice(start, start + PHOTO_COLUMNS)
    rows.push({
      type: 'photos',
      key: `${key}:photos:${start}`,
      items,
      last: start + PHOTO_COLUMNS >= photos.length,
      filesFollow,
    })
  }
}

function pushFileRows(rows: AttachmentListRow[], files: AttachmentItem[]) {
  files.forEach((item, index) => {
    rows.push({
      type: 'file',
      key: attachmentKey(item),
      item,
      first: index === 0,
      last: index === files.length - 1,
    })
  })
}

export function buildAttachmentRows(
  sections: AttachmentSection[],
  expandedKeys: Set<string>,
): AttachmentListRow[] {
  const rows: AttachmentListRow[] = []
  for (const section of sections) {
    const key = sectionKey(section)
    const expanded = expandedKeys.has(section.key)
    const photos = expanded ? section.photos : section.photos.slice(0, PHOTO_COLUMNS)
    const files = expanded ? section.files : section.files.slice(0, COLLAPSED_FILES)
    const hidden = section.count - photos.length - files.length
    rows.push({
      type: 'header',
      key: `${key}:header`,
      section,
      expanded,
      collapsible: expanded || hidden > 0,
    })
    pushPhotoRows(rows, key, photos, files.length > 0)
    pushFileRows(rows, files)
  }
  return rows
}
