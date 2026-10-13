import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFocusEffect } from 'expo-router'
import type { TFunction } from 'i18next'

import {
  countOpenUpcoming,
  isFoldedGroup,
  UPCOMING_GROUP,
} from '@pear-notes/core/store/services/noteTasks.js'
import { loadUpcomingGroups, setTaskDone } from '@pear-notes/core/store/services/upcomingTasks.js'

export type UpcomingTask = {
  noteKey: string
  title: string
  text: string
  date: string
  time: string | null
  checklist: boolean
  yearly?: boolean
  sinceYear?: number | null
  done?: boolean
}

export type UpcomingGroup = {
  group: string
  items: UpcomingTask[]
}

export type UpcomingSection = {
  group: string
  title: string
  folded: boolean
  data: UpcomingTask[]
}

const NEXT_GROUPS: string[] = [
  UPCOMING_GROUP.TODAY,
  UPCOMING_GROUP.TOMORROW,
  UPCOMING_GROUP.THIS_WEEK,
  UPCOMING_GROUP.LATER,
]

const pendingId = (task: UpcomingTask) => `${task.noteKey}|${task.date}|${task.text}`

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

const taskDate = (task: UpcomingTask, withTime: boolean) => {
  const [year, month, day] = task.date.split('-').map(Number)
  const [hour, minute] = (withTime && task.time ? task.time : '00:00').split(':').map(Number)
  return new Date(year, month - 1, day, hour, minute)
}

export function formatUpcomingWhen(
  task: UpcomingTask,
  t: TFunction,
  language: string,
  now = Date.now(),
): string {
  const days = Math.round(
    (taskDate(task, false).getTime() - new Date(now).setHours(0, 0, 0, 0)) / DAY_MS,
  )
  if (task.time && days === 0) {
    const diff = taskDate(task, true).getTime() - now
    if (diff < HOUR_MS) {
      return t('upcoming.when.inMinutes', { count: Math.max(1, Math.round(diff / MINUTE_MS)) })
    }
    return t('upcoming.when.inHours', { count: Math.round(diff / HOUR_MS) })
  }
  if (days <= 0) return t('upcoming.when.today')
  if (days === 1) return t('upcoming.when.tomorrow')
  return formatUpcomingDue({ ...task, time: null }, language)
}

export function upcomingAge(task: UpcomingTask): number {
  return task.yearly && task.sinceYear ? Number(task.date.slice(0, 4)) - task.sinceYear : 0
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

export function formatUpcomingWhenShort(
  task: UpcomingTask,
  language: string,
  now = Date.now(),
): string {
  const date = taskDate(task, true)
  const days = Math.round(
    (taskDate(task, false).getTime() - new Date(now).setHours(0, 0, 0, 0)) / DAY_MS,
  )
  const time = task.time
    ? date.toLocaleTimeString(language, { hour: 'numeric', minute: '2-digit' })
    : ''
  if (days === 0) return time
  const day =
    days > 0 && days < 7
      ? date.toLocaleDateString(language, { weekday: 'short' })
      : date.toLocaleDateString(language, { month: 'short', day: 'numeric' })
  return time ? `${day} ${time}` : day
}

export function upcomingTaskKey(task: UpcomingTask, index: number): string {
  return `${task.noteKey}-${index}-${task.text}`
}

export function useUpcomingTasks() {
  const { t } = useTranslation()
  const [groups, setGroups] = useState<UpcomingGroup[] | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [pending, setPending] = useState<Set<string>>(() => new Set())
  const [openFolds, setOpenFolds] = useState<Set<string>>(() => new Set())
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

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
      (groups ?? []).map(({ group, items }) => {
        const folded = isFoldedGroup(group)
        return {
          group,
          folded,
          title: folded
            ? t(`upcoming.folds.${group}`, { count: items.length })
            : t(`upcoming.groups.${group}`),
          data: folded && !openFolds.has(group) ? [] : items,
        }
      }),
    [groups, openFolds, t],
  )

  const next = useMemo(
    () => (groups ?? []).find(({ group }) => NEXT_GROUPS.includes(group))?.items[0] ?? null,
    [groups],
  )

  const overdue = useMemo(
    () => (groups ?? []).find(({ group }) => group === UPCOMING_GROUP.OVERDUE)?.items.length ?? 0,
    [groups],
  )

  const toggleFold = useCallback((group: string) => {
    setOpenFolds((current) => {
      const nextFolds = new Set(current)
      if (!nextFolds.delete(group)) nextFolds.add(group)
      return nextFolds
    })
  }, [])

  const toggleDone = useCallback(
    async (task: UpcomingTask) => {
      const id = pendingId(task)
      setPending((current) => new Set(current).add(id))
      try {
        await setTaskDone(task, !task.done)
      } catch {
      } finally {
        if (mountedRef.current) {
          setPending((current) => {
            const nextPending = new Set(current)
            nextPending.delete(id)
            return nextPending
          })
          load()
        }
      }
    },
    [load],
  )

  const isPending = useCallback((task: UpcomingTask) => pending.has(pendingId(task)), [pending])

  const count = useMemo(() => countOpenUpcoming(groups ?? []), [groups])

  return {
    sections,
    count,
    overdue,
    next,
    loaded: groups !== null,
    refreshing,
    refresh,
    toggleDone,
    isPending,
    openFolds,
    toggleFold,
  }
}

const UPCOMING_COUNT_REFRESH_MS = 60 * 1000

export function useUpcomingCount(): number {
  const [count, setCount] = useState(0)
  const refresh = useCallback(() => {
    loadUpcomingGroups()
      .then((groups: UpcomingGroup[]) => setCount(countOpenUpcoming(groups)))
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
