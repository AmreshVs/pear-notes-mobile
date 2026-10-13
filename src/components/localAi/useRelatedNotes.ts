import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { shallowEqual, useDispatch, useSelector } from 'react-redux'

import { AI_SUGGESTION } from '@pear-notes/core/store/services/aiSuggestionPrefs.js'
import {
  closeRelatedNotes,
  getLocalAiIndex,
  getMeaningSearchNotice,
  getRelatedNotesState,
  loadRelatedNotes,
  openRelatedNotes,
} from '@pear-notes/core/store/slices/localAiSlice.js'
import { getNotesData, getRelatedNoteRows } from '@pear-notes/core/store/slices/notesSlice.js'

import { useAiSuggestionOn } from '@/hooks/useAiSuggestionOn'
import { shortDate } from '@/utils/noteDates'

export type RelatedRow = { key: string; title: string; snippet: string; date: string }

export function useRelatedNotes(noteId: string, shown: boolean) {
  const relatedOn = useAiSuggestionOn(AI_SUGGESTION.RELATED)
  const visible = shown && relatedOn
  const { t } = useTranslation()
  const dispatch = useDispatch()

  const related = useSelector(getRelatedNotesState, shallowEqual) as {
    noteKey: string | null
    status: string
    forKey: string | null
  }
  const rawRows = useSelector(getRelatedNoteRows) as { key: string; snippet: string }[]
  const notesData = useSelector(getNotesData) as Record<
    string,
    { title?: string; updatedAt?: number } | undefined
  >
  const notice = useSelector(getMeaningSearchNotice, shallowEqual) as {
    kind: string
    done?: number
    total?: number
  } | null
  const changedAt = (useSelector(getLocalAiIndex) as { changedAt: number }).changedAt

  useEffect(() => {
    if (!visible || !noteId) return
    dispatch(openRelatedNotes(noteId))
    return () => {
      dispatch(closeRelatedNotes())
    }
  }, [dispatch, visible, noteId])

  const relatedKey = related.noteKey
  useEffect(() => {
    if (visible && noteId && noteId === relatedKey) dispatch(loadRelatedNotes(noteId as any))
  }, [dispatch, visible, noteId, relatedKey, changedAt])

  const rows = useMemo<RelatedRow[]>(
    () =>
      rawRows.map((row) => ({
        key: row.key,
        title: notesData[row.key]?.title || t('activity.untitledNote'),
        snippet: row.snippet,
        date: shortDate(notesData[row.key]?.updatedAt ?? 0),
      })),
    [rawRows, notesData, t],
  )

  const isLoading = related.forKey !== noteId && related.status !== 'failed'
  const failed = related.status === 'failed'

  const emptyTitle = isLoading
    ? t('relatedNotes.loading')
    : failed
      ? t('relatedNotes.failedTitle')
      : t('relatedNotes.emptyTitle')
  const emptyDescription =
    notice?.kind === 'indexing'
      ? t('relatedNotes.indexing', { done: notice.done, total: notice.total })
      : failed
        ? t('relatedNotes.failedDescription')
        : t('relatedNotes.emptyDescription')

  return {
    rows,
    noteTitle: notesData[noteId]?.title || t('activity.untitledNote'),
    isLoading,
    emptyTitle,
    emptyDescription,
  }
}
