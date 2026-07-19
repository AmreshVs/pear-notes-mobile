import { BACKUP_ERROR } from '@pear-notes/core/constant.js'

const BACKUP_ERROR_KEYS: Record<string, string> = {
  [BACKUP_ERROR.INVALID_FILE]: 'backup.errors.invalidFile',
  [BACKUP_ERROR.INCORRECT_RECOVERY_KEY]: 'backup.errors.incorrectPassword',
  [BACKUP_ERROR.INCORRECT_PASSWORD]: 'backup.errors.incorrectPassword',
  [BACKUP_ERROR.PASSWORD_REQUIRED]: 'backup.errors.passwordRequired',
  [BACKUP_ERROR.UNSUPPORTED_VERSION]: 'backup.errors.unsupportedVersion',
}

export function getBackupErrorMessage(code: string, t: (key: string) => string): string {
  const key = BACKUP_ERROR_KEYS[code]
  return key ? t(key) : code
}
