import { useEffect } from 'react'
import { AppState } from 'react-native'
import { useStore } from 'react-redux'

import { getNotes } from '@pear-notes/core/store/slices/notesSlice.js'

import {
  IN_SESSION_CACHE_MAX_AGE_MS,
  pruneAttachmentCache,
  sweepThumbnailCache,
  sweepTransientUploadCache,
} from '@/lib/cacheCleanup'

// Cleanup, not correctness — a burst of edits must not turn into a burst of directory scans.
const SWEEP_DEBOUNCE_MS = 45 * 1000
const SWEEP_MIN_INTERVAL_MS = 5 * 60 * 1000

export function useAttachmentCachePrune() {
  // The store is read imperatively rather than with useSelector: this hook lives in the root
  // layout, and subscribing it to the note list would re-render the whole app on every save.
  const store = useStore()

  useEffect(() => {
    let lastSweepAt = 0
    let debounce: ReturnType<typeof setTimeout> | null = null

    // Sweeping a half-hydrated store would delete live thumbnails, so wait until the note list has
    // finished loading and every key has its data. A skipped round is caught by the next trigger.
    const collectNotes = () => {
      const state = store.getState() as any
      const notesState = state?.notes
      if (!notesState || notesState.isLoading) return null
      const notes = (getNotes(state) ?? []) as { value?: { note?: string } | null }[]
      if (notes.length !== (notesState.notesKeys?.length ?? 0)) return null
      return notes
    }

    const sweepThumbnails = (force: boolean) => {
      const now = Date.now()
      if (!force && now - lastSweepAt < SWEEP_MIN_INTERVAL_MS) return
      const notes = collectNotes()
      if (!notes) return
      lastSweepAt = now
      sweepThumbnailCache(notes).catch(() => {})
    }

    pruneAttachmentCache().catch(() => {})
    sweepTransientUploadCache()
    sweepThumbnails(true)

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'background') return
      pruneAttachmentCache(IN_SESSION_CACHE_MAX_AGE_MS).catch(() => {})
      // Deletions that synced in during this session get reclaimed as the user leaves.
      sweepThumbnails(true)
    })

    // A PDF removed on a linked device only surfaces as a change to the note data, so react to
    // that too rather than waiting for the app to be backgrounded.
    let lastNotesData = (store.getState() as any)?.notes?.notesData
    const unsubscribe = store.subscribe(() => {
      const notesData = (store.getState() as any)?.notes?.notesData
      if (notesData === lastNotesData) return
      lastNotesData = notesData
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(() => sweepThumbnails(false), SWEEP_DEBOUNCE_MS)
    })

    return () => {
      subscription.remove()
      unsubscribe()
      if (debounce) clearTimeout(debounce)
    }
  }, [store])
}
