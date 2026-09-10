import {
  findDeviceByLocalKey,
  getActivityDeviceLabel,
  getActivityMessage,
} from '@pear-notes/core/activity.js'
import { ACTIVITY_EVENT } from '@pear-notes/core/constant.js'

import { getPlatformNames, type PickerOption } from '@/utils/settingsUtils'

type TranslateFn = (key: string, options?: Record<string, unknown>) => string

export type ActivityEntry = {
  id: string
  event: string
  device: string
  at: number
  lastAt: number
  ops: number
  targetKind: string
  targetKey: string
  targetTitle: string
  locked: boolean
  hasDiff: boolean
  recoverable?: boolean
  meta: Record<string, string | number>
}

export type ActivityGroup = {
  key: string
  at: number
  entries: ActivityEntry[]
}

const DAY_MS = 86_400_000
const DIFFABLE_EVENTS = new Set([ACTIVITY_EVENT.NOTE_EDITED, ACTIVITY_EVENT.NOTE_EDIT_DISCARDED])

export function groupActivityByDay(entries: ActivityEntry[]): ActivityGroup[] {
  const groups: ActivityGroup[] = []
  let current: ActivityGroup | null = null

  for (const entry of entries) {
    const at = entry.lastAt || entry.at
    const key = new Date(at).toDateString()
    if (!current || current.key !== key) {
      current = { key, at, entries: [] }
      groups.push(current)
    }
    current.entries.push(entry)
  }

  return groups
}

export function formatActivityDay(at: number, t: TranslateFn): string {
  const date = new Date(at)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (date.toDateString() === now.toDateString()) return t('activity.today')
  if (diff < 2 * DAY_MS) {
    const yesterday = new Date(now.getTime() - DAY_MS)
    if (date.toDateString() === yesterday.toDateString()) return t('activity.yesterday')
  }
  return date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
}

export function formatActivityTime(entry: ActivityEntry): string {
  const format = (value: number) =>
    new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (entry.lastAt > entry.at) return `${format(entry.at)} – ${format(entry.lastAt)}`
  return format(entry.at)
}

export function getActivityDeviceName(localKey: string, devices: any[], t: TranslateFn): string {
  return getActivityDeviceLabel(localKey, devices, {
    platformNames: getPlatformNames(t),
    unknownLabel: t('sync.platforms.unknown'),
  })
}

export function getActivityDeviceOptions(devices: any[], t: TranslateFn): PickerOption[] {
  const options = devices
    .filter((device) => device?.localKey)
    .map((device) => ({
      label: getActivityDeviceName(device.localKey, devices, t),
      value: device.localKey as string,
    }))
  return [{ label: t('activity.filters.anyDevice'), value: '' }, ...options]
}

export function isMobileActivityDevice(localKey: string, devices: any[]): boolean {
  return findDeviceByLocalKey(devices, localKey)?.deviceType === 'mobile'
}

export function isActivityHidden(entry: ActivityEntry, unlocked: boolean): boolean {
  return !!entry.locked && !unlocked
}

export function canExpandActivity(entry: ActivityEntry, hidden: boolean): boolean {
  return DIFFABLE_EVENTS.has(entry.event) && !!entry.hasDiff && !hidden
}

export function isDiscardedActivity(entry: ActivityEntry): boolean {
  return entry.event === ACTIVITY_EVENT.NOTE_EDIT_DISCARDED
}

export function canRecoverActivity(entry: ActivityEntry, hidden: boolean): boolean {
  return isDiscardedActivity(entry) && !!entry.recoverable && !hidden
}

export function buildActivityMessage(
  entry: ActivityEntry,
  t: TranslateFn,
  hidden: boolean,
  showTarget: boolean,
): string {
  return getActivityMessage(entry, t, { hidden, showTarget })
}
