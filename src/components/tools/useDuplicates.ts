import { useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform } from 'react-native'
import { shallowEqual, useDispatch, useSelector } from 'react-redux'
import { router } from 'expo-router'

import { getFolders } from '@pear-notes/core/store/slices/foldersSlice.js'
import {
  dismissDuplicateNotes,
  getDuplicateNotesState,
  getLocalAiIndex,
  loadDuplicateNotes,
} from '@pear-notes/core/store/slices/localAiSlice.js'
import { getDuplicatePairRows, getNotesData } from '@pear-notes/core/store/slices/notesSlice.js'

import { useNoteEditor } from '@/providers/NoteEditorContext'

export type DuplicatePairRow = {
  id: string
  a: string
  b: string
  titleA: string
  titleB: string
  percent: number
  folderName: string | null
}

export function useDuplicates() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { openNote } = useNoteEditor()

  const duplicates = useSelector(getDuplicateNotesState, shallowEqual) as { status: string }
  const pairs = useSelector(getDuplicatePairRows) as { a: string; b: string; score: number }[]
  const notesData = useSelector(getNotesData) as Record<
    string,
    { title?: string; folderKey?: string } | undefined
  >
  const folders = useSelector(getFolders) as { id: string; name: string }[]
  const index = useSelector(getLocalAiIndex) as { changedAt: number; lastRun?: { total?: number } }

  useEffect(() => {
    dispatch({ type: loadDuplicateNotes.type, payload: { force: true } })
  }, [dispatch, index.changedAt])

  const rows = useMemo<DuplicatePairRow[]>(
    () =>
      pairs.map((pair) => {
        const folderKey = notesData[pair.a]?.folderKey
        const sharedFolder =
          folderKey && folderKey === notesData[pair.b]?.folderKey
            ? (folders.find((folder) => folder.id === folderKey)?.name ?? null)
            : null
        return {
          id: `${pair.a}|${pair.b}`,
          a: pair.a,
          b: pair.b,
          titleA: notesData[pair.a]?.title || t('activity.untitledNote'),
          titleB: notesData[pair.b]?.title || t('activity.untitledNote'),
          percent: Math.min(100, Math.round(pair.score * 100)),
          folderName: sharedFolder,
        }
      }),
    [pairs, notesData, folders, t],
  )

  const dismissPair = useCallback(
    (a: string, b: string) => {
      dispatch(dismissDuplicateNotes({ a, b } as any))
    },
    [dispatch],
  )

  const openFromPane = useCallback(
    (key: string) => {
      if (Platform.OS === 'ios') openNote(key)
      else router.push(`/note/${key}`)
    },
    [openNote],
  )

  const checking = duplicates.status !== 'done' && duplicates.status !== 'failed'
  const failed = duplicates.status === 'failed'

  return {
    rows,
    checking,
    failed,
    checkedCount: index.lastRun?.total ?? 0,
    dismissPair,
    openNote: openFromPane,
  }
}
