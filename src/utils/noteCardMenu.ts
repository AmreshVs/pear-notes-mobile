import { NOTE_ACTION } from '@/constants/noteActions'

import type { ContextMenuItem } from '../../modules/expo-context-menu'

export type NoteCardMenuLabels = {
  restore: string
  moveTo: string
  moveToVault: string
  noFolders: string
  pin: string
  unpin: string
  lock: string
  unlock: string
  delete: string
}

export type NoteCardMenuOptions = {
  labels: NoteCardMenuLabels
  locked?: boolean
  pinned?: boolean
  canRestore: boolean
  canMove: boolean
  canToggleLock: boolean
  canTogglePin: boolean
  canDelete: boolean
  moveFolders?: { id: string; name: string }[]
  moveVaults?: { id: string; name: string }[]
}

export function buildNoteCardMenu({
  labels,
  locked,
  pinned,
  canRestore,
  canMove,
  canToggleLock,
  canTogglePin,
  canDelete,
  moveFolders,
  moveVaults,
}: NoteCardMenuOptions): ContextMenuItem[] {
  const items: ContextMenuItem[] = []

  if (canRestore) {
    items.push({
      id: NOTE_ACTION.restore,
      title: labels.restore,
      systemImage: 'arrow.uturn.backward',
    })
  }

  if (canMove) {
    items.push({
      id: NOTE_ACTION.moveTo,
      title: labels.moveTo,
      systemImage: 'folder.badge.plus',
      children:
        moveFolders && moveFolders.length > 0
          ? moveFolders.map((folder) => ({
              id: `${NOTE_ACTION.moveTo}:${folder.id}`,
              title: folder.name,
              systemImage: 'folder',
            }))
          : [
              {
                id: `${NOTE_ACTION.moveTo}:none`,
                title: labels.noFolders,
                systemImage: 'folder.badge.minus',
              },
            ],
    })
  }

  if (canMove && moveVaults && moveVaults.length > 0) {
    items.push({
      id: NOTE_ACTION.moveToVault,
      title: labels.moveToVault,
      systemImage: 'square.stack.3d.up',
      children: moveVaults.map((vault) => ({
        id: `${NOTE_ACTION.moveToVault}:${vault.id}`,
        title: vault.name,
        systemImage: 'square.stack.3d.up',
      })),
    })
  }

  if (canTogglePin) {
    items.push({
      id: NOTE_ACTION.togglePin,
      title: pinned ? labels.unpin : labels.pin,
      systemImage: pinned ? 'pin.slash' : 'pin',
    })
  }

  if (canToggleLock) {
    items.push({
      id: NOTE_ACTION.toggleLock,
      title: locked ? labels.unlock : labels.lock,
      systemImage: locked ? 'lock.slash' : 'lock',
    })
  }

  if (canDelete) {
    items.push({
      id: NOTE_ACTION.delete,
      title: labels.delete,
      systemImage: 'trash',
      destructive: true,
    })
  }

  return items
}
