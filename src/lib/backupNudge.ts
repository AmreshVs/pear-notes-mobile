import { backendApi } from '@pear-notes/core/backend/api.js'

import { BACKUP_NUDGE_INTERVAL_MS } from '@/constants/constants'
import { loadLastBackupDate } from '@/lib/backupUtils'

import type { BackupNudgeState } from './backupNudge.types'

const DISMISSED_AT_KEY = 'backupNudgeDismissedAt'
const SHEET_SEEN_KEY = 'backupNudgeSheetSeen'
const SHEET_SEEN_VALUE = 'true'

function toTime(value: string | null): number | null {
  if (!value) return null
  const time = /^\d+$/.test(value) ? Number(value) : Date.parse(value)
  return Number.isFinite(time) ? time : null
}

export async function loadBackupNudgeState(): Promise<BackupNudgeState> {
  const [lastBackup, dismissedAt, sheetSeen] = await Promise.all([
    loadLastBackupDate(),
    backendApi.getPreference({ key: DISMISSED_AT_KEY }).catch(() => null),
    backendApi.getPreference({ key: SHEET_SEEN_KEY }).catch(() => null),
  ])
  return {
    lastBackupAt: toTime(lastBackup),
    dismissedAt: toTime(dismissedAt),
    sheetSeen: sheetSeen === SHEET_SEEN_VALUE,
  }
}

export async function snoozeBackupNudge(now: number): Promise<void> {
  await backendApi.updatePreference({ key: DISMISSED_AT_KEY, value: String(now) }).catch(() => {})
}

export async function markBackupNudgeSheetSeen(): Promise<void> {
  await backendApi
    .updatePreference({ key: SHEET_SEEN_KEY, value: SHEET_SEEN_VALUE })
    .catch(() => {})
}

export function isWithinNudgeInterval(time: number | null, now: number): boolean {
  return time !== null && now - time < BACKUP_NUDGE_INTERVAL_MS
}
