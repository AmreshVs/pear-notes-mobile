import { useSyncExternalStore } from 'react'

import { authenticate } from '@/lib/deviceAuth'

const unlockedKeys = new Set<string>()
const listeners = new Set<() => void>()
let version = 0

function emit() {
  version++
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return version
}

export function isNoteUnlocked(key: string): boolean {
  return unlockedKeys.has(key)
}

export function relockNote(key: string) {
  if (unlockedKeys.delete(key)) emit()
}

export function markNoteUnlocked(key: string) {
  if (!key) return
  if (!unlockedKeys.has(key)) {
    unlockedKeys.add(key)
    emit()
  }
}

export function clearUnlockedNotes() {
  if (unlockedKeys.size > 0) {
    unlockedKeys.clear()
    emit()
  }
}

export async function unlockNote(key: string, reason: string): Promise<boolean> {
  if (!key) return false
  if (unlockedKeys.has(key)) return true
  const ok = await authenticate(reason)
  if (ok) {
    unlockedKeys.add(key)
    emit()
  }
  return ok
}

export function useNoteLockVersion(): number {
  return useSyncExternalStore(subscribe, getSnapshot)
}
