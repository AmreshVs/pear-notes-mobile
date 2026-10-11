import type { TFunction } from 'i18next'

import { isFoldedGroup, UPCOMING_GROUP } from '@pear-notes/core/store/services/noteTasks.js'

import { upcomingAge, type UpcomingTask } from '@/hooks/useUpcomingTasks'

export function yearlyLabel(task: UpcomingTask, t: TFunction): string {
  const age = upcomingAge(task)
  return age > 0 ? t('upcoming.turns', { age }) : t('upcoming.everyYear')
}

export function upcomingNoteLine(task: UpcomingTask, t: TFunction): string {
  const title = task.title || t('noteCard.untitled')
  return task.yearly ? `${yearlyLabel(task, t)} · ${title}` : title
}

export function showsReminderBell(task: UpcomingTask, group: string, remindersOn: boolean) {
  return (
    remindersOn && Boolean(task.time) && group !== UPCOMING_GROUP.OVERDUE && !isFoldedGroup(group)
  )
}

export function isOverdueGroup(group: string): boolean {
  return group === UPCOMING_GROUP.OVERDUE
}

export function formatReminderTime(time: string, language: string): string {
  const [hour, minute] = time.split(':').map(Number)
  const at = new Date()
  at.setHours(hour, minute, 0, 0)
  return at.toLocaleTimeString(language, { hour: 'numeric', minute: '2-digit' })
}
