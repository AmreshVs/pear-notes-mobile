import { router } from 'expo-router'
import { useSyncExternalStore } from 'react'

let visible = false
let resolver: ((ok: boolean) => void) | null = null
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

export function requestNoteLockPassword(): Promise<boolean> {
  return new Promise((resolve) => {
    if (resolver) resolver(false)
    resolver = resolve
    visible = true
    emit()
  })
}

export function requestNoteLockPasswordScreen(): Promise<boolean> {
  return new Promise((resolve) => {
    if (resolver) resolver(false)
    resolver = resolve
    router.push('/settings/note-lock-password?mode=enter&purpose=verify' as any)
  })
}

export function resolveNoteLockPassword(ok: boolean): void {
  if (visible) {
    visible = false
    emit()
  }
  const current = resolver
  resolver = null
  if (current) current(ok)
}

export function useNoteUnlockVisible(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot)
}
