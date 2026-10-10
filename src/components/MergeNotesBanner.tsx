import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import * as notesSlice from '@pear-notes/core/store/slices/notesSlice.js'

import { FloatingNoticeBanner } from './FloatingNoticeBanner'

const { getLastMerge, setLastMerge, undoMergeNotes } = notesSlice as unknown as {
  getLastMerge: (state: unknown) => unknown
  setLastMerge: (value: null) => { type: string }
  undoMergeNotes: () => { type: string }
}

const VISIBLE_MS = 12000

const KIND_ICON = {
  merge: { ios: 'arrow.triangle.merge', android: 'call-merge' },
  split: { ios: 'arrow.triangle.branch', android: 'call-split' },
  move: { ios: 'folder', android: 'folder-move-outline' },
} as const

const KIND_TITLE = {
  merge: 'notesList.merge.action',
  split: 'noteEditor.contextMenu.splitNote',
  move: 'tidyUp.title',
} as const

type LastMerge = {
  kind?: string
  mergedKey?: string
  originals?: unknown[]
  createdKeys?: unknown[]
  moves?: unknown[]
  error?: string
} | null

export function MergeNotesBanner() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const last = useSelector(getLastMerge) as LastMerge

  useEffect(() => {
    if (!last) return
    const timer = setTimeout(() => dispatch(setLastMerge(null)), VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [dispatch, last])

  if (!last) return null

  const dismiss = () => dispatch(setLastMerge(null))
  const kind = last.kind === 'split' || last.kind === 'move' ? last.kind : 'merge'
  const canUndo = !last.error && (!!last.mergedKey || (last.moves?.length ?? 0) > 0)
  const doneCount =
    kind === 'split'
      ? (last.createdKeys?.length ?? 0)
      : kind === 'move'
        ? (last.moves?.length ?? 0)
        : (last.originals?.length ?? 0)
  const description = last.error
    ? t(`notesList.${kind}.refused.${last.error}`, {
        defaultValue: t(`notesList.${kind}.refused.failed`),
      })
    : t(`notesList.${kind}.done`, { count: doneCount })

  return (
    <FloatingNoticeBanner
      icon={KIND_ICON[kind]}
      title={t(KIND_TITLE[kind])}
      description={description}
      descriptionLines={3}
      actionLabel={canUndo ? t(`notesList.${kind}.undo`) : t('common.close')}
      onAction={canUndo ? () => dispatch(undoMergeNotes()) : dismiss}
      dismissLabel={t('common.close')}
      onDismiss={dismiss}
    />
  )
}
