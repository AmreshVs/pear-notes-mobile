import { useSyncExternalStore } from 'react'
import { router } from 'expo-router'

export type NoteLockPasswordPurpose = 'lock' | 'unlock'

let visible = false
let resolver: ((ok: boolean) => void) | null = null
let currentReason: string | undefined
let currentPurpose: NoteLockPasswordPurpose = 'unlock'
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

export function requestNoteLockPassword(
  reason?: string,
  purpose: NoteLockPasswordPurpose = 'unlock',
): Promise<boolean> {
  return new Promise((resolve) => {
    if (resolver) resolver(false)
    resolver = resolve
    currentReason = reason
    currentPurpose = purpose
    visible = true
    emit()
  })
}

export function getNoteUnlockReason(): string | undefined {
  return currentReason
}

export function getNoteLockPasswordPurpose(): NoteLockPasswordPurpose {
  return currentPurpose
}

export function requestNoteLockPasswordScreen(): Promise<boolean> {
  return new Promise((resolve) => {
    if (resolver) resolver(false)
    resolver = resolve
    router.push('/settings/note-lock-password?mode=enter&purpose=verify' as any)
  })
}

export function requestNoteLockPasswordCreate(): Promise<boolean> {
  return new Promise((resolve) => {
    if (resolver) resolver(false)
    resolver = resolve
    router.push('/settings/note-lock-password?mode=create&purpose=set' as any)
  })
}

export function resolveNoteLockPassword(ok: boolean): void {
  if (visible) {
    visible = false
    emit()
  }
  currentReason = undefined
  currentPurpose = 'unlock'
  const current = resolver
  resolver = null
  if (current) current(ok)
}

export function useNoteUnlockVisible(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot)
}
