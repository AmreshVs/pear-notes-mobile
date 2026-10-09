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

export function setAppUpdateNoticeVisible(next: boolean) {
  if (visible === next) return
  visible = next
  for (const listener of listeners) listener()
}

export function useAppUpdateNoticeVisible(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot)
}
