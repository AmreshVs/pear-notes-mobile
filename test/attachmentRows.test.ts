import { buildAttachmentRows, COLLAPSED_FILES, PHOTO_COLUMNS } from '../src/utils/attachmentRows'

const photo = (n: number) => ({ noteKey: 'n', url: `p${n}` }) as any
const file = (n: number) => ({ noteKey: 'n', url: `f${n}` }) as any

const section = (photos: number, files: number) =>
  ({
    key: 'folder',
    photos: Array.from({ length: photos }, (_, i) => photo(i)),
    files: Array.from({ length: files }, (_, i) => file(i)),
    count: photos + files,
  }) as any

describe('buildAttachmentRows', () => {
  it('shows a few photos and files until the section is expanded', () => {
    const rows = buildAttachmentRows([section(10, 5)], new Set())
    expect(rows.filter((r) => r.type === 'photos')).toHaveLength(1)
    expect(rows.filter((r) => r.type === 'file')).toHaveLength(COLLAPSED_FILES)
    expect(rows[0]).toMatchObject({ type: 'header', expanded: false, collapsible: true })
  })

  it('shows everything when expanded, photos in rows of four', () => {
    const rows = buildAttachmentRows([section(10, 5)], new Set(['folder']))
    const photoRows = rows.filter((r) => r.type === 'photos') as any[]
    expect(photoRows.map((r) => r.items.length)).toEqual([PHOTO_COLUMNS, PHOTO_COLUMNS, 2])
    expect(rows.filter((r) => r.type === 'file')).toHaveLength(5)
  })

  it('does not offer to collapse a section that already fits', () => {
    const rows = buildAttachmentRows([section(2, 1)], new Set())
    expect(rows[0]).toMatchObject({ collapsible: false })
  })
})
