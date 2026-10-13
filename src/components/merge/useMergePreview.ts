import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import { TRASH_RETENTION_DAYS } from '@pear-notes/core/constant.js'
import { MERGE_LINE } from '@pear-notes/core/store/services/noteMerge.js'
import { getFoldersData } from '@pear-notes/core/store/slices/foldersSlice.js'
import * as notesSlice from '@pear-notes/core/store/slices/notesSlice.js'

import type { MergeColumn, MergePreview } from './mergePreviewTypes'

const { clearMergePreview, getMergePreview, mergeNotes } = notesSlice as unknown as {
  clearMergePreview: () => { type: string }
  getMergePreview: (state: unknown) => MergePreview | null
  mergeNotes: (payload: { keys: string[] }) => { type: string }
}

export const MERGE_LINE_KIND = MERGE_LINE as Record<string, string>

export function useMergePreview() {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const preview = useSelector(getMergePreview)
  const folders = useSelector(getFoldersData) as Record<string, { title?: string }> | undefined

  const close = useCallback(() => {
    dispatch(clearMergePreview())
  }, [dispatch])

  const merge = useCallback(() => {
    if (!preview) return
    dispatch(mergeNotes({ keys: preview.keys }))
    dispatch(clearMergePreview())
  }, [dispatch, preview])

  const columns = useMemo<MergeColumn[]>(() => {
    if (preview?.status !== 'ready') return []
    const untitled = t('noteCard.untitled')
    const folderName = (key?: string | null) => (key && folders?.[key]?.title) || t('folders.title')
    const dateLabel = (at: number | null) =>
      at ? new Date(at).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' }) : ''
    const sources = (preview.sources ?? []).map((source, index) => ({
      id: source.key ?? String(index),
      label: t('mergePreview.source', {
        number: index + 1,
        folder: folderName(source.folderKey),
        date: dateLabel(source.updatedAt),
      }),
      title: source.title || untitled,
      lines: source.lines,
      result: false,
    }))
    return [
      ...sources,
      {
        id: 'result',
        label: t('mergePreview.result', { folder: folderName(preview.folderKey) }),
        title: preview.title || untitled,
        lines: preview.result ?? [],
        result: true,
      },
    ]
  }, [preview, folders, t, i18n.language])

  const errorText =
    preview?.status === 'error'
      ? t(`notesList.merge.refused.${preview.error}`, {
          defaultValue: t('notesList.merge.refused.failed'),
        })
      : null

  return {
    visible: preview !== null,
    ready: preview?.status === 'ready',
    loading: preview?.status === 'loading',
    title: t('mergePreview.title', { count: preview?.keys.length ?? 0 }),
    description: t('mergePreview.desc', { days: TRASH_RETENTION_DAYS }),
    columns,
    dropped: preview?.status === 'ready' ? (preview.dropped ?? []) : [],
    errorText,
    close,
    merge,
  }
}
