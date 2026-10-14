import type { UpcomingTask } from '@/hooks/useUpcomingTasks'

export type UpcomingTaskRowProps = {
  task: UpcomingTask
  language: string
  remind: boolean
  pending: boolean
  onOpen: (task: UpcomingTask) => void
  onToggleDone: (task: UpcomingTask) => void
}

export type UpcomingNextCardProps = {
  task: UpcomingTask
  language: string
  onOpen: (task: UpcomingTask) => void
}

export type UpcomingFoldHeaderProps = {
  group: string
  title: string
  expanded: boolean
  onToggle: (group: string) => void
}

export type UpcomingBirthdayRowProps = {
  task: UpcomingTask
  language: string
  onOpen: (task: UpcomingTask) => void
}

export type UpcomingAllBirthdaysRowProps = {
  count: number
  onPress: () => void
}
