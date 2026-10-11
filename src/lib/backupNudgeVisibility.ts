import { useSyncExternalStore } from 'react'

let visible = false
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return visible
}

export function setBackupNudgeVisible(next: boolean) {
  if (visible === next) return
  visible = next
  for (const listener of listeners) listener()
}

export function useBackupNudgeVisible(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot)
}
