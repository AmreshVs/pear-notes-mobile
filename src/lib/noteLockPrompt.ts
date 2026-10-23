import { useSyncExternalStore } from 'react'

export type NoteLockPromptKind = 'migration' | 'biometricOffer' | 'changeSuggested'

let current: NoteLockPromptKind | null = null
let resolver: ((accepted: boolean) => void) | null = null
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

export function showNoteLockPrompt(kind: NoteLockPromptKind): Promise<boolean> {
  return new Promise((resolve) => {
    if (resolver) resolver(false)
    resolver = resolve
    current = kind
    emit()
  })
}

export function resolveNoteLockPrompt(accepted: boolean): void {
  current = null
  emit()
  const done = resolver
  resolver = null
  if (done) done(accepted)
}

export function useNoteLockPrompt(): NoteLockPromptKind | null {
  return useSyncExternalStore(subscribe, () => current)
}
