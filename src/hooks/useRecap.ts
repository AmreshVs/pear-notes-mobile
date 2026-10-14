import { useCallback, useState } from 'react'
import { useStore } from 'react-redux'
import { useFocusEffect } from 'expo-router'
import type { TFunction } from 'i18next'

import { buildRecap } from '@pear-notes/core/store/services/recap.js'
import { getNotesData } from '@pear-notes/core/store/slices/notesSlice.js'

export type RecapNote = {
  key: string
  title?: string
  updatedAt: number
}

export type RecapDay = {
  start: number
  notes: RecapNote[]
}

export type Recap = {
  from: number
  days: RecapDay[]
  editedCount: number
}

export type RecapSection = {
  id: string
  start: number
  data: RecapNote[]
}

const DAY_MS = 24 * 60 * 60 * 1000
const RANGE_FORMAT: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }

/** Days with edits, newest first, as list sections. */
export function recapSections(recap: Recap | null): RecapSection[] {
  if (!recap) return []
  return recap.days
    .filter((day) => day.notes.length > 0)
    .reverse()
    .map((day) => ({ id: String(day.start), start: day.start, data: day.notes }))
}

/** "Oct 8 – 14", or "Sep 29 – Oct 5" across a month. */
export function formatRecapRange(recap: Recap, language: string) {
  const first = new Date(recap.from)
  const last = new Date(recap.days[recap.days.length - 1].start)
  const end =
    first.getMonth() === last.getMonth()
      ? last.toLocaleDateString(language, { day: 'numeric' })
      : last.toLocaleDateString(language, RANGE_FORMAT)
  return `${first.toLocaleDateString(language, RANGE_FORMAT)} – ${end}`
}

/** "Today", "Yesterday", else "Monday, Oct 12". */
export function formatRecapDay(start: number, recap: Recap, t: TFunction, language: string) {
  const today = recap.days[recap.days.length - 1].start
  if (start === today) return t('recap.today')
  // Day starts can be 23 or 25 hours apart across DST, so round.
  if (Math.round((today - start) / DAY_MS) === 1) return t('recap.yesterday')
  return new Date(start).toLocaleDateString(language, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

export function useRecap() {
  const store = useStore()
  const [recap, setRecap] = useState<Recap | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(() => {
    const notes = Object.entries(
      (getNotesData(store.getState()) ?? {}) as Record<string, Record<string, unknown>>,
    ).map(([key, value]) => ({ key, ...value }))
    setRecap(buildRecap({ notes }) as Recap)
  }, [store])

  useFocusEffect(load)

  const refresh = useCallback(() => {
    setRefreshing(true)
    load()
    setRefreshing(false)
  }, [load])

  return { recap, loaded: recap !== null, refreshing, refresh }
}
