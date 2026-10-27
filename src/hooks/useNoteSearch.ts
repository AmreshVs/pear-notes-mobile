import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { ALL_NOTES_KEY, LOCKED_NOTES_KEY, RECENTLY_DELETED_KEY } from '@pear-notes/core/constant.js'
import {
  getActiveSearchHits,
  getSearchScope,
  getSearchSettled,
  getSearchTerms,
  SEARCH_SCOPE,
  setSearchIncludeLocked,
} from '@pear-notes/core/store/slices/searchSlice.js'
import { getSearchQuery } from '@pear-notes/core/store/slices/uiSlice.js'

import { useHasUnlockedNotes } from '@/lib/noteLock'

export interface NoteSearchHit {
  inTitle: boolean
  snippet: string
  ranges: number[]
}

export function useNoteSearch(folderId: string | undefined) {
  const dispatch = useDispatch()
  const searchQuery = (useSelector(getSearchQuery) as string) || ''
  const searchHits = useSelector(getActiveSearchHits) as Record<string, NoteSearchHit>
  const searchTerms = useSelector(getSearchTerms) as string[]
  const searchScope = useSelector(getSearchScope)
  const searchSettled = useSelector(getSearchSettled) as boolean
  const hasUnlockedNotes = useHasUnlockedNotes()

  useEffect(() => {
    dispatch(setSearchIncludeLocked(hasUnlockedNotes))
  }, [dispatch, hasUnlockedNotes])

  const hasSearchQuery = searchQuery.trim().length > 0
  const isLockedView = folderId === LOCKED_NOTES_KEY
  const canScopeSearch =
    !!folderId && folderId !== ALL_NOTES_KEY && folderId !== RECENTLY_DELETED_KEY && !isLockedView
  const searchingAll = hasSearchQuery && canScopeSearch && searchScope === SEARCH_SCOPE.ALL

  return {
    searchHits,
    searchTerms,
    searchScope,
    hideEmptyState: hasSearchQuery && !searchSettled,
    showSearchScope: hasSearchQuery && canScopeSearch,
    showFolderNames: folderId === ALL_NOTES_KEY || isLockedView || searchingAll,
  }
}
