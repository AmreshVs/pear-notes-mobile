import { BACKUP_ERROR } from '@pear-notes/core/constant.js'

import { getBackupErrorMessage } from '../src/utils/backupErrors'

const t = (key: string) => key

describe('getBackupErrorMessage', () => {
  it('maps known errors and a wrong recovery key reads as a wrong password', () => {
    expect(getBackupErrorMessage(BACKUP_ERROR.INVALID_FILE, t)).toBe('backup.errors.invalidFile')
    expect(getBackupErrorMessage(BACKUP_ERROR.INCORRECT_RECOVERY_KEY, t)).toBe(
      'backup.errors.incorrectPassword',
    )
  })

  it('shows unknown errors as they are', () => {
    expect(getBackupErrorMessage('boom', t)).toBe('boom')
  })
})
