import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import { LOCKED_NOTES_KEY } from '@pear-notes/core/constant.js'
import { AI_SUGGESTION } from '@pear-notes/core/store/services/aiSuggestionPrefs.js'
import { LOCAL_AI_ENABLED } from '@pear-notes/core/store/services/localAiCatalog.js'
import { getSelectedFolder } from '@pear-notes/core/store/slices/foldersSlice.js'
import { getLocalAiIndex, loadDuplicateNotes } from '@pear-notes/core/store/slices/localAiSlice.js'
import {
  getDuplicatePairRows,
  getNoteCountsPerFolder,
} from '@pear-notes/core/store/slices/notesSlice.js'

import { TOOL_ROW } from '@/constants/constants'
import { useAiSuggestionOn } from '@/hooks/useAiSuggestionOn'
import { useAttachmentCount } from '@/hooks/useAttachments'
import { useUpcomingCount } from '@/hooks/useUpcomingTasks'

export type ToolRow = {
  id: string
  name: string
  icon: string
  count: number
}

export function useToolRows(query: string): ToolRow[] {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const upcomingCount = useUpcomingCount()
  const attachmentCount = useAttachmentCount()
  const tasksOn = useAiSuggestionOn(AI_SUGGESTION.TASKS)
  const relatedOn = useAiSuggestionOn(AI_SUGGESTION.RELATED)
  const index = useSelector(getLocalAiIndex) as { enabled: boolean; changedAt?: number }
  const duplicateCount = (useSelector(getDuplicatePairRows) as unknown[]).length
  const lockedCount =
    (useSelector(getNoteCountsPerFolder) as Record<string, number>)[LOCKED_NOTES_KEY] || 0
  const lockedSelected = useSelector(getSelectedFolder) === LOCKED_NOTES_KEY
  const showDuplicates = LOCAL_AI_ENABLED && index.enabled && relatedOn
  const changedAt = index.changedAt

  useEffect(() => {
    if (showDuplicates) dispatch(loadDuplicateNotes())
  }, [dispatch, showDuplicates, changedAt])

  return useMemo(() => {
    const rows: ToolRow[] = []
    if (tasksOn) {
      rows.push({
        id: TOOL_ROW.upcoming,
        name: t('tools.upcoming'),
        icon: 'calendar',
        count: upcomingCount,
      })
    }
    if (attachmentCount > 0) {
      rows.push({
        id: TOOL_ROW.attachments,
        name: t('tools.attachments'),
        icon: 'attachments',
        count: attachmentCount,
      })
    }
    if (lockedCount > 0 || lockedSelected) {
      rows.push({
        id: LOCKED_NOTES_KEY,
        name: t('tools.locked'),
        icon: 'locked',
        count: lockedCount,
      })
    }
    if (showDuplicates) {
      rows.push({
        id: TOOL_ROW.duplicates,
        name: t('tools.duplicates'),
        icon: 'duplicates',
        count: duplicateCount,
      })
    }
    rows.push({ id: TOOL_ROW.recap, name: t('tools.recap'), icon: 'recap', count: 0 })
    const needle = query.trim().toLowerCase()
    return needle ? rows.filter((row) => row.name.toLowerCase().includes(needle)) : rows
  }, [
    t,
    tasksOn,
    upcomingCount,
    attachmentCount,
    lockedCount,
    lockedSelected,
    showDuplicates,
    duplicateCount,
    query,
  ])
}
