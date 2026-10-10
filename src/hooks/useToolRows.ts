import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import { LOCAL_AI_ENABLED } from '@pear-notes/core/store/services/localAiCatalog.js'
import { getLocalAiIndex, loadDuplicateNotes } from '@pear-notes/core/store/slices/localAiSlice.js'
import { getDuplicatePairRows } from '@pear-notes/core/store/slices/notesSlice.js'

import { TOOL_ROW } from '@/constants/constants'
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
  const index = useSelector(getLocalAiIndex) as { enabled: boolean; changedAt?: number }
  const duplicateCount = (useSelector(getDuplicatePairRows) as unknown[]).length
  const showDuplicates = LOCAL_AI_ENABLED && index.enabled
  const changedAt = index.changedAt

  useEffect(() => {
    if (showDuplicates) dispatch(loadDuplicateNotes())
  }, [dispatch, showDuplicates, changedAt])

  return useMemo(() => {
    const rows: ToolRow[] = [
      { id: TOOL_ROW.upcoming, name: t('tools.upcoming'), icon: 'calendar', count: upcomingCount },
    ]
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
  }, [t, upcomingCount, showDuplicates, duplicateCount, query])
}
