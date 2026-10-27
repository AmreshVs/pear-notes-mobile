import { NOTE_ACTION } from '../src/constants/noteActions'
import { buildNoteCardMenu } from '../src/utils/noteCardMenu'

const labels = {
  restore: 'Restore',
  moveTo: 'Move to',
  moveToVault: 'Move to vault',
  noFolders: 'No folders',
  pin: 'Pin',
  unpin: 'Unpin',
  lock: 'Lock',
  unlock: 'Unlock',
  delete: 'Delete',
}

const none = {
  labels,
  canRestore: false,
  canMove: false,
  canToggleLock: false,
  canTogglePin: false,
  canDelete: false,
}

describe('buildNoteCardMenu', () => {
  it('is empty when nothing is allowed', () => {
    expect(buildNoteCardMenu(none)).toEqual([])
  })

  it('offers restore for trashed notes', () => {
    const items = buildNoteCardMenu({ ...none, canRestore: true })
    expect(items.map((item) => item.id)).toEqual([NOTE_ACTION.restore])
  })

  it('lists folders to move into, or says there are none', () => {
    const withFolders = buildNoteCardMenu({
      ...none,
      canMove: true,
      moveFolders: [{ id: 'f1', name: 'Work' }],
    })
    expect(withFolders[0].children?.map((child) => child.title)).toEqual(['Work'])
    const empty = buildNoteCardMenu({ ...none, canMove: true, moveFolders: [] })
    expect(empty[0].children?.map((child) => child.title)).toEqual(['No folders'])
  })

  it('offers moving to another vault only when there is one', () => {
    const without = buildNoteCardMenu({ ...none, canMove: true })
    expect(without.some((item) => item.id === NOTE_ACTION.moveToVault)).toBe(false)
    const withVault = buildNoteCardMenu({
      ...none,
      canMove: true,
      moveVaults: [{ id: 'v1', name: 'Home' }],
    })
    expect(withVault.find((item) => item.id === NOTE_ACTION.moveToVault)?.children).toHaveLength(1)
  })
})
