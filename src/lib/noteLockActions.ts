import { updateNote } from '@pear-notes/core/store/slices/notesSlice.js'

import { authenticate, isDeviceAuthSupported } from '@/lib/deviceAuth'
import { showLockUnavailable } from '@/lib/lockInfoModal'
import { relockNote } from '@/lib/noteLock'
import { requestNoteLockPassword } from '@/lib/noteLockPasswordFlow'

type ToggleArgs = {
  key: string
  currentlyLocked: boolean
  reason: string
  dispatch: (action: any) => void
  lockMethod?: string
}

export async function authenticateWithLockMethod(
  reason: string,
  lockMethod: string = 'biometric',
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
  return requestNoteLockPassword()
}

export async function toggleNoteLock({
  key,
  currentlyLocked,
  reason,
  dispatch,
  lockMethod = 'biometric',
}: ToggleArgs): Promise<void> {
  if (!key) return
  const usePassword = lockMethod === 'password'
  if (currentlyLocked) {
    const ok = await authenticateWithLockMethod(reason, lockMethod)
    if (!ok) return
    dispatch(updateNote({ key, locked: false } as any))
    relockNote(key)
    return
  }
  if (!usePassword) {
    const supported = await isDeviceAuthSupported()
    if (!supported) {
      showLockUnavailable()
      return
    }
  }
  dispatch(updateNote({ key, locked: true } as any))
  relockNote(key)
}
