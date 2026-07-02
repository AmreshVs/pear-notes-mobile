import { updateNote } from '@pear-notes/core/store/slices/notesSlice.js'

import { authenticate, isDeviceAuthSupported } from '@/lib/deviceAuth'
import { relockNote } from '@/lib/noteLock'

type ToggleArgs = {
  key: string
  currentlyLocked: boolean
  reason: string
  dispatch: (action: any) => void
  onUnavailable?: () => void
}

export async function toggleNoteLock({
  key,
  currentlyLocked,
  reason,
  dispatch,
  onUnavailable,
}: ToggleArgs): Promise<void> {
  if (!key) return
  if (currentlyLocked) {
    const ok = await authenticate(reason)
    if (!ok) return
    dispatch(updateNote({ key, locked: false }))
    relockNote(key)
    return
  }
  const supported = await isDeviceAuthSupported()
  if (!supported) {
    onUnavailable?.()
    return
  }
  dispatch(updateNote({ key, locked: true }))
  relockNote(key)
}
