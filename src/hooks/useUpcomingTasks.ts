import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFocusEffect } from 'expo-router'

import { loadUpcomingGroups } from '@pear-notes/core/store/services/upcomingTasks.js'

export type UpcomingTask = {
  noteKey: string
  title: string
  text: string
  date: string
  time: string | null
  checklist: boolean
}

export type UpcomingGroup = {
  group: string
  items: UpcomingTask[]
}

export type UpcomingSection = {
  group: string
  title: string
  data: UpcomingTask[]
}

export function formatUpcomingDue(task: UpcomingTask, language: string): string {
  const [year, month, day] = task.date.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const label = date.toLocaleDateString(language, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  if (!task.time) return label
  const [hour, minute] = task.time.split(':').map(Number)
  date.setHours(hour, minute)
  return `${label} · ${date.toLocaleTimeString(language, { hour: 'numeric', minute: '2-digit' })}`
}

export function upcomingTaskKey(task: UpcomingTask, index: number): string {
  return `${task.noteKey}-${index}-${task.text}`
}

export function useUpcomingTasks() {
  const { t } = useTranslation()
  const [groups, setGroups] = useState<UpcomingGroup[] | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      setGroups((await loadUpcomingGroups()) as UpcomingGroup[])
    } catch {
      setGroups([])
    }
  }, [])

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

  const sections = useMemo<UpcomingSection[]>(
    () =>
      (groups ?? []).map(({ group, items }) => ({
        group,
        title: t(`upcoming.groups.${group}`),
        data: items,
      })),
    [groups, t],
  )

  const count = useMemo(
    () => (groups ?? []).reduce((sum, group) => sum + group.items.length, 0),
    [groups],
  )

  return { sections, count, loaded: groups !== null, refreshing, refresh }
}

const UPCOMING_COUNT_REFRESH_MS = 60 * 1000

export function useUpcomingCount(): number {
  const [count, setCount] = useState(0)
  const refresh = useCallback(() => {
    loadUpcomingGroups()
      .then((groups: UpcomingGroup[]) =>
        setCount(groups.reduce((sum, group) => sum + group.items.length, 0)),
      )
      .catch(() => {})
  }, [])
  useFocusEffect(
    useCallback(() => {
      refresh()
      const timer = setInterval(refresh, UPCOMING_COUNT_REFRESH_MS)
      return () => clearInterval(timer)
    }, [refresh]),
  )
  return count
}
