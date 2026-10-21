import { getNoteData, updateNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { store } from '@pear-notes/core/store/store.js'

import { deleteNoteThumbnails } from '@/lib/cacheCleanup'
import { hapticSuccess } from '@/lib/haptics'
import { type NoteLockPasswordPurpose } from '@/lib/noteLockPasswordFlow'
import { unlockLockedNotes } from '@/lib/noteLockSession'

type ToggleArgs = {
  key: string
  currentlyLocked: boolean
  reason: string
  lockReason: string
  dispatch: (action: any) => void
}

export function isStoredNoteLocked(key: string | null | undefined): boolean {
  if (!key) return false
  const note = getNoteData(key)(store.getState()) as { locked?: boolean } | undefined
  return note?.locked === true
}

export function authenticateWithLockMethod(
  reason: string,
  purpose: NoteLockPasswordPurpose = 'unlock',
): Promise<boolean> {
  return unlockLockedNotes(reason, purpose)
}

export async function toggleNoteLock({
  key,
  currentlyLocked,
  reason,
  lockReason,
  dispatch,
}: ToggleArgs): Promise<void> {
  if (!key) return
  const ok = await authenticateWithLockMethod(
    currentlyLocked ? reason : lockReason,
    currentlyLocked ? 'unlock' : 'lock',
  )
  if (!ok) return
  dispatch(updateNote({ key, locked: !currentlyLocked } as any))
  hapticSuccess()
  if (!currentlyLocked) await deleteNoteThumbnails(getNoteData(key)(store.getState()) as object)
}
