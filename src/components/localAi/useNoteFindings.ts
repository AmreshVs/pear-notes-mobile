import { useCallback, useEffect, useMemo, useState } from 'react'

import { getNoteFindings } from '@pear-notes/core/store/services/noteTasks.js'
import { loadDoneIds } from '@pear-notes/core/store/services/upcomingTasks.js'

import { useRemindersSetting } from '@/hooks/useReminders'
import { findingDay } from '@/utils/noteDates'

export interface NoteFinding {
  key: string
  text: string
  day: string
  isTask: boolean
}

interface FoundTask {
  text: string
  date: string
  time: string | null
  checklist: boolean
}

interface NoteFindingsOptions {
  noteId: string
  visible: boolean
  getNoteHtml: () => string
  title: string
  anchor?: number
  onMakeTasks: (texts: string[]) => void
}

export function useNoteFindings({
  noteId,
  visible,
  getNoteHtml,
  title,
  anchor,
  onMakeTasks,
}: NoteFindingsOptions) {
  const [html, setHtml] = useState('')
  const [doneIds, setDoneIds] = useState<Set<string> | null>(null)
  const [madeTasks, setMadeTasks] = useState<Set<string>>(new Set())
  const [remindersOn, toggleReminders] = useRemindersSetting()

  useEffect(() => {
    if (!visible) return
    setHtml(getNoteHtml())
    setMadeTasks(new Set())
    let live = true
    loadDoneIds()
      .then((ids: Set<string>) => {
        if (live) setDoneIds(ids)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [visible, noteId])

  const findings = useMemo<NoteFinding[]>(() => {
    if (!html) return []
    const found = getNoteFindings(html, {
      noteKey: noteId,
      title,
      doneIds,
      ...(anchor ? { anchor } : {}),
    }) as FoundTask[]
    return found.map((task) => ({
      key: `${task.date}|${task.text}`,
      text: task.text,
      day: findingDay(task.date, task.time),
      isTask: task.checklist || madeTasks.has(task.text),
    }))
  }, [anchor, doneIds, html, madeTasks, noteId, title])

  const notTasks = useMemo(
    () => findings.filter((item) => !item.isTask).map((item) => item.text),
    [findings],
  )

  const handleAddToUpcoming = useCallback(() => {
    if (!notTasks.length) return
    onMakeTasks(notTasks)
    setMadeTasks((current) => new Set([...current, ...notTasks]))
  }, [notTasks, onMakeTasks])

  return {
    findings,
    canAddToUpcoming: notTasks.length > 0,
    remindersOn,
    handleSetReminders: toggleReminders,
    handleAddToUpcoming,
  }
}
