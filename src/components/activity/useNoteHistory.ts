import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import {
  fetchNoteActivity,
  getActivityIsLoading,
  getNoteActivityEntries,
} from '@pear-notes/core/store/slices/activitySlice.js'
import { getNoteData } from '@pear-notes/core/store/slices/notesSlice.js'
import { getActivityLogEnabled } from '@pear-notes/core/store/slices/settingsSlice.js'

import { type ActivityEntry, type ActivityGroup, groupActivityByDay } from '@/utils/activityUtils'

export function useNoteHistory(noteId: string) {
  const dispatch = useDispatch()

  const entries = useSelector(getNoteActivityEntries(noteId)) as ActivityEntry[]
  const noteData = useSelector(getNoteData(noteId)) as any
  const isLoading = useSelector(getActivityIsLoading) as boolean
  const enabled = useSelector(getActivityLogEnabled) as boolean

  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (noteId) dispatch(fetchNoteActivity({ noteKey: noteId } as any))
  }, [dispatch, noteId])

  const groups: ActivityGroup[] = useMemo(() => groupActivityByDay(entries), [entries])

  const toggleExpanded = useCallback((id: string) => {
    setExpandedId((current) => (current === id ? null : id))
  }, [])

  return {
    groups,
    noteTitle: noteData?.title || '',
    isLoading,
    enabled,
    isEmpty: entries.length === 0,
    expandedId,
    toggleExpanded,
  }
}
