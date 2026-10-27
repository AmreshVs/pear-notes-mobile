import { backendApi } from '@pear-notes/core/backend/api.js'

import { BACKUP_NUDGE_INTERVAL_MS } from '../src/constants/constants'
import {
  isWithinNudgeInterval,
  loadBackupNudgeState,
  markBackupNudgeSheetSeen,
  snoozeBackupNudge,
} from '../src/lib/backupNudge'
import { loadLastBackupDate } from '../src/lib/backupUtils'

jest.mock('@pear-notes/core/backend/api.js', () => ({
  backendApi: { getPreference: jest.fn(), updatePreference: jest.fn() },
}))
jest.mock('../src/lib/backupUtils', () => ({ loadLastBackupDate: jest.fn() }))

const getPreference = backendApi.getPreference as unknown as jest.Mock
const updatePreference = backendApi.updatePreference as unknown as jest.Mock
const loadBackupDate = loadLastBackupDate as jest.Mock

describe('loadBackupNudgeState', () => {
  it('reads the last backup, snooze time and whether the sheet was seen', async () => {
    loadBackupDate.mockResolvedValue('2026-01-01T00:00:00.000Z')
    getPreference.mockImplementation(async ({ key }: { key: string }) =>
      key === 'backupNudgeDismissedAt' ? '1700000000000' : 'true',
    )
    await expect(loadBackupNudgeState()).resolves.toEqual({
      lastBackupAt: Date.parse('2026-01-01T00:00:00.000Z'),
      dismissedAt: 1700000000000,
      sheetSeen: true,
    })
  })

  it('treats missing or unreadable values as never', async () => {
    loadBackupDate.mockResolvedValue(null)
    getPreference.mockRejectedValue(new Error('not ready'))
    await expect(loadBackupNudgeState()).resolves.toEqual({
      lastBackupAt: null,
      dismissedAt: null,
      sheetSeen: false,
    })
  })
})

describe('snoozing and marking seen', () => {
  it('saves the snooze time and the seen flag, ignoring save failures', async () => {
    updatePreference.mockRejectedValue(new Error('not ready'))
    await expect(snoozeBackupNudge(123)).resolves.toBeUndefined()
    expect(updatePreference).toHaveBeenCalledWith({ key: 'backupNudgeDismissedAt', value: '123' })
    await markBackupNudgeSheetSeen()
    expect(updatePreference).toHaveBeenCalledWith({ key: 'backupNudgeSheetSeen', value: 'true' })
  })
})

describe('isWithinNudgeInterval', () => {
  const now = 10 * BACKUP_NUDGE_INTERVAL_MS

  it('is true only for a recent time', () => {
    expect(isWithinNudgeInterval(now - 1000, now)).toBe(true)
    expect(isWithinNudgeInterval(now - BACKUP_NUDGE_INTERVAL_MS, now)).toBe(false)
    expect(isWithinNudgeInterval(null, now)).toBe(false)
  })
})
