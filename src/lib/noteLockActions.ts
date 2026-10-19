import { getNoteData, updateNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { store } from '@pear-notes/core/store/store.js'

import { deleteNoteThumbnails } from '@/lib/cacheCleanup'
import { authenticate, isDeviceAuthSupported } from '@/lib/deviceAuth'
import { hapticSuccess } from '@/lib/haptics'
import { showLockUnavailable } from '@/lib/lockInfoModal'
import { type NoteLockPasswordPurpose, requestNoteLockPassword } from '@/lib/noteLockPasswordFlow'

type ToggleArgs = {
  key: string
  currentlyLocked: boolean
  reason: string
  lockReason: string
  dispatch: (action: any) => void
  lockMethod?: string
}

export function isStoredNoteLocked(key: string | null | undefined): boolean {
  if (!key) return false
  const note = getNoteData(key)(store.getState()) as { locked?: boolean } | undefined
  return note?.locked === true
}

export async function authenticateWithLockMethod(
  reason: string,
  lockMethod: string = 'biometric',
  purpose: NoteLockPasswordPurpose = 'unlock',
): Promise<boolean> {
  const usePassword = lockMethod === 'password'
  if (!usePassword) {
    const supported = await isDeviceAuthSupported()
    if (!supported) {
      showLockUnavailable()
      return false
    }
    return authenticate(reason)
  }
  return requestNoteLockPassword(reason, purpose)
}

export async function toggleNoteLock({
  key,
  currentlyLocked,
  reason,
  lockReason,
  dispatch,
  lockMethod = 'biometric',
}: ToggleArgs): Promise<void> {
  if (!key) return
  const ok = await authenticateWithLockMethod(
    currentlyLocked ? reason : lockReason,
    lockMethod,
    currentlyLocked ? 'unlock' : 'lock',
  )
  if (!ok) return
  dispatch(updateNote({ key, locked: !currentlyLocked } as any))
  hapticSuccess()
  if (!currentlyLocked) await deleteNoteThumbnails(getNoteData(key)(store.getState()) as object)
}
