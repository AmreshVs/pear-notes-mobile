import { useSyncExternalStore } from 'react'

let visible = false
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

function getSnapshot() {
  return visible
}

export function showLockUnavailable() {
  if (!visible) {
    visible = true
    emit()
  }
}

export function hideLockInfo() {
  if (visible) {
    visible = false
    emit()
  }
}

export function useLockInfoVisible(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot)
}
