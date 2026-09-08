import { useSyncExternalStore } from 'react'

import { authenticate } from '@/lib/deviceAuth'
import { hapticSuccess } from '@/lib/haptics'

let sessionUnlocked = false
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function markNoteUnlocked(key: string) {
  if (!key || sessionUnlocked) return
  sessionUnlocked = true
  emit()
}

export function clearUnlockedNotes() {
  if (!sessionUnlocked) return
  sessionUnlocked = false
  emit()
}

export async function unlockNote(key: string, reason: string): Promise<boolean> {
  if (!key) return false
  if (sessionUnlocked) return true
  const ok = await authenticate(reason)
  if (ok) {
    sessionUnlocked = true
    emit()
    hapticSuccess()
  }
  return ok
}

export function useIsNoteUnlocked(key: string | null): boolean {
  return useSyncExternalStore(subscribe, () => (key ? sessionUnlocked : false))
}

export function useHasUnlockedNotes(): boolean {
  return useSyncExternalStore(subscribe, () => sessionUnlocked)
}
