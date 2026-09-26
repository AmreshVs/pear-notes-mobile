import { useSyncExternalStore } from 'react'

let bottomOffset: number | null = null
const listeners = new Set<() => void>()

export function setToastBottomOffset(offset: number | null): void {
  if (offset === bottomOffset) return
  bottomOffset = offset
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useToastBottomOffset(): number | null {
  return useSyncExternalStore(subscribe, () => bottomOffset)
}
