import type { TFunction } from 'i18next'

import {
  BIRTHDAYS_GROUP,
  isFoldedGroup,
  UPCOMING_GROUP,
} from '@pear-notes/core/store/services/noteTasks.js'

import { upcomingAge, upcomingDaysAway, type UpcomingTask } from '@/hooks/useUpcomingTasks'

export function upcomingText(task: UpcomingTask): string {
  return task.name || task.text
}

export function isBirthdaysGroup(group: string): boolean {
  return group === BIRTHDAYS_GROUP
}

export function birthdayMeta(task: UpcomingTask, t: TFunction): string {
  const days = upcomingDaysAway(task)
  const when =
    days <= 0
      ? t('upcoming.when.today')
      : days === 1
        ? t('upcoming.when.tomorrow')
        : t('upcoming.when.inDays', { count: days })
  return `${yearlyLabel(task, t)} · ${when}`
}

export type BirthdayMonth = { key: string; title: string; data: UpcomingTask[] }

export function birthdaysByMonth(tasks: UpcomingTask[], language: string): BirthdayMonth[] {
  const thisYear = new Date().getFullYear()
  const months: BirthdayMonth[] = []
  for (const task of tasks) {
    const key = task.date.slice(0, 7)
    let month = months[months.length - 1]
    if (month?.key !== key) {
      const [year, index] = key.split('-').map(Number)
      const title = new Date(year, index - 1, 1).toLocaleDateString(language, {
        month: 'long',
        ...(year !== thisYear ? { year: 'numeric' } : {}),
      })
      month = { key, title, data: [] }
      months.push(month)
    }
    month.data.push(task)
  }
  return months
}

export function birthdayTile(task: UpcomingTask, language: string) {
  const [year, month, day] = task.date.split('-').map(Number)
  return {
    month: new Date(year, month - 1, day).toLocaleDateString(language, { month: 'short' }),
    day: String(day),
  }
}

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
    remindersOn &&
    Boolean(task.time) &&
    group !== UPCOMING_GROUP.OVERDUE &&
    !isFoldedGroup(group) &&
    !isBirthdaysGroup(group)
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
