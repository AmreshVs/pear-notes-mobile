import { useCallback, useState } from 'react'
import { useStore } from 'react-redux'
import { useFocusEffect } from 'expo-router'

import { buildRecap } from '@pear-notes/core/store/services/recap.js'
import { loadUpcomingGroups } from '@pear-notes/core/store/services/upcomingTasks.js'
import { getNotesData } from '@pear-notes/core/store/slices/notesSlice.js'

import type { UpcomingGroup, UpcomingTask } from '@/hooks/useUpcomingTasks'

export type RecapNote = {
  key: string
  title?: string
  updatedAt: number
}

export type Recap = {
  comingUp: UpcomingTask[]
  edited: RecapNote[]
  editedCount: number
  yearAgo: RecapNote[]
}

export type RecapRow =
  | { kind: 'task'; id: string; task: UpcomingTask }
  | { kind: 'note'; id: string; note: RecapNote }

export type RecapSection = {
  id: 'comingUp' | 'edited' | 'yearAgo'
  data: RecapRow[]
}

export function recapSections(recap: Recap | null): RecapSection[] {
  if (!recap) return []
  const sections: RecapSection[] = [
    {
      id: 'comingUp',
      data: recap.comingUp.map((task, index) => ({
        kind: 'task',
        id: `${task.noteKey}-${index}-${task.text}`,
        task,
      })),
    },
    {
      id: 'edited',
      data: recap.edited.map((note) => ({ kind: 'note', id: `edited-${note.key}`, note })),
    },
    {
      id: 'yearAgo',
      data: recap.yearAgo.map((note) => ({ kind: 'note', id: `yearAgo-${note.key}`, note })),
    },
  ]
  return sections.filter((section) => section.data.length > 0)
}

export function useRecap() {
  const store = useStore()
  const [recap, setRecap] = useState<Recap | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const notes = Object.entries(
      (getNotesData(store.getState()) ?? {}) as Record<string, Record<string, unknown>>,
    ).map(([key, value]) => ({ key, ...value }))
    const groups = (await loadUpcomingGroups().catch(() => [])) as UpcomingGroup[]
    setRecap(buildRecap({ groups, notes }) as Recap)
  }, [store])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  return { recap, loaded: recap !== null, refreshing, refresh }
}
