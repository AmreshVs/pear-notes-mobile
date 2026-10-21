import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'

import { getNoteKeys, getNotesData } from '@pear-notes/core/store/slices/notesSlice.js'

const NOTES_SETTLE_MS = 400

type NotesSnapshot = { notesData: unknown; noteKeys: unknown }

export function useOnNotesChanged(callback: () => void, enabled = true) {
  const notesData = useSelector(getNotesData)
  const noteKeys = useSelector(getNoteKeys)
  const seenRef = useRef<NotesSnapshot | null>(null)

  useEffect(() => {
    if (!enabled) return
    const seen = seenRef.current
    seenRef.current = { notesData, noteKeys }
    if (!seen || (seen.notesData === notesData && seen.noteKeys === noteKeys)) return
    const timer = setTimeout(callback, NOTES_SETTLE_MS)
    return () => clearTimeout(timer)
  }, [notesData, noteKeys, enabled, callback])
}
