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
    if (!usePassword) {
      const supported = await isDeviceAuthSupported()
      if (!supported) {
        showLockUnavailable()
        return
      }
    }
    const ok = usePassword ? await requestNoteLockPassword() : await authenticate(reason)
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
