import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import { SUGGESTION_KIND } from '@pear-notes/core/store/services/noteSuggestions.js'
import * as localAiSlice from '@pear-notes/core/store/slices/localAiSlice.js'
import * as notesSlice from '@pear-notes/core/store/slices/notesSlice.js'

type DuplicatePair = { a: string; b: string; score: number }
type TitleSuggestion = { noteKey: string; title: string }
type StoredNote = { title?: string; createdAt?: number; updatedAt?: number }

const { getNotesData, getUpcomingSuggestions, previewMergeNotes, upcomingDuplicateId } =
  notesSlice as unknown as {
    getNotesData: (state: unknown) => Record<string, StoredNote | undefined>
    getUpcomingSuggestions: (state: unknown) => {
      duplicate: DuplicatePair | null
      title: TitleSuggestion | null
    }
    previewMergeNotes: (payload: { keys: string[] }) => { type: string }
    upcomingDuplicateId: (pair: DuplicatePair) => string
  }

const {
  acceptUpcomingTitle,
  dismissNoteSuggestion,
  loadUpcomingSuggestions,
  snoozeUpcomingSuggestion,
} = localAiSlice as unknown as {
  acceptUpcomingTitle: (payload: TitleSuggestion) => { type: string }
  dismissNoteSuggestion: (payload: { noteKey: string; kind: string }) => { type: string }
  loadUpcomingSuggestions: () => { type: string }
  snoozeUpcomingSuggestion: (id: string) => { type: string }
}

export function useUpcomingSuggestions() {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const { duplicate, title } = useSelector(getUpcomingSuggestions)
  const notesData = useSelector(getNotesData)

  useEffect(() => {
    dispatch(loadUpcomingSuggestions())
  }, [dispatch])

  const noteTitle = (key: string) => notesData?.[key]?.title || t('noteCard.untitled')
  const titledNote = title ? notesData?.[title.noteKey] : undefined
  const titledAt = titledNote?.createdAt || titledNote?.updatedAt

  const duplicateText = duplicate
    ? t('upcoming.suggestions.duplicate', { a: noteTitle(duplicate.a), b: noteTitle(duplicate.b) })
    : null
  const titleText = title
    ? t('upcoming.suggestions.name', {
        title: title.title,
        date: titledAt
          ? new Date(titledAt).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })
          : '',
      })
    : null

  const reviewMerge = useCallback(() => {
    if (duplicate) dispatch(previewMergeNotes({ keys: [duplicate.a, duplicate.b] }))
  }, [dispatch, duplicate])

  const snoozeDuplicate = useCallback(() => {
    if (duplicate) dispatch(snoozeUpcomingSuggestion(upcomingDuplicateId(duplicate)))
  }, [dispatch, duplicate])

  const acceptTitle = useCallback(() => {
    if (title) dispatch(acceptUpcomingTitle(title))
  }, [dispatch, title])

  const dismissTitle = useCallback(() => {
    if (title) {
      dispatch(dismissNoteSuggestion({ noteKey: title.noteKey, kind: SUGGESTION_KIND.TITLE }))
    }
  }, [dispatch, title])

  return {
    visible: Boolean(duplicateText || titleText),
    duplicateText,
    titleText,
    reviewMerge,
    snoozeDuplicate,
    acceptTitle,
    dismissTitle,
  }
}
