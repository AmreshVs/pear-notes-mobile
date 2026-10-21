import { useEffect, useState, useSyncExternalStore } from 'react'

import { backendApi } from '@pear-notes/core/backend/api.js'
import * as log from '@pear-notes/core/log.js'
import { getNotesData, setNotesDataBatch } from '@pear-notes/core/store/slices/notesSlice.js'
import { store } from '@pear-notes/core/store/store.js'

const PENDING_SAVE_GRACE_MS = 600

let sessionUnlocked = false
let generation = 0
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

type StoredNote = { sealed?: boolean; bodyOmitted?: boolean; note?: string; summary?: unknown }

function purgeSealedBodies() {
  const notes = getNotesData(store.getState()) as Record<string, StoredNote | undefined>
  const batch = Object.entries(notes)
    .filter(([, note]) => note?.sealed && !note.bodyOmitted)
    .map(([key, note]) => ({ key, data: { ...note, note: '', summary: null, bodyOmitted: true } }))
  if (batch.length > 0) store.dispatch(setNotesDataBatch(batch))
}

export function isNoteSessionUnlocked(): boolean {
  return sessionUnlocked
}

export function markNoteUnlocked(key?: string) {
  if (key === '' || sessionUnlocked) return
  sessionUnlocked = true
  generation++
  emit()
}

// The editor saves on background and on close; give that save time to reach the backend
// before the session closes, or the backend refuses it.
export function clearUnlockedNotes({ afterPendingSaves = false } = {}) {
  const closing = generation
  const close = () => {
    if (closing !== generation) return
    backendApi.closeLockSession().catch((e: unknown) => log.error('closeLockSession', e))
    purgeSealedBodies()
  }
  if (afterPendingSaves) setTimeout(close, PENDING_SAVE_GRACE_MS)
  else close()
  if (!sessionUnlocked) return
  sessionUnlocked = false
  emit()
}

export function useIsNoteUnlocked(key: string | null): boolean {
  return useSyncExternalStore(subscribe, () => (key ? sessionUnlocked : false))
}

export function useHasUnlockedNotes(): boolean {
  return useSyncExternalStore(subscribe, () => sessionUnlocked)
}

type SealedNoteState = { sealed?: boolean; bodyOmitted?: boolean } | null | undefined

// A note restored from a backup can stay sealed under another password after the session opens.
export function useNeedsOtherLockPassword(key: string | null, note: SealedNoteState): boolean {
  const unlocked = useIsNoteUnlocked(key)
  const candidate = unlocked && !!note?.sealed && !!note?.bodyOmitted
  const [needed, setNeeded] = useState(false)

  useEffect(() => {
    if (!candidate || !key) {
      setNeeded(false)
      return
    }
    let active = true
    backendApi
      .getSingleNote({ key })
      .then((response: { data?: SealedNoteState } | null) => {
        if (active) setNeeded(!!response?.data?.sealed && !!response.data.bodyOmitted)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [candidate, key])

  return candidate && needed
}
