import { getBackupPasswordStrength } from '@pear-notes/core/utils.js'

const STRENGTH_LABEL_KEYS = [
  'backup.password.strength.veryWeak',
  'backup.password.strength.veryWeak',
  'backup.password.strength.weak',
  'backup.password.strength.fair',
  'backup.password.strength.good',
  'backup.password.strength.strong',
]

export const PASSWORD_RULE_KEYS = [
  { key: 'length', labelKey: 'backup.password.rules.length' },
  { key: 'uppercase', labelKey: 'backup.password.rules.uppercase' },
  { key: 'lowercase', labelKey: 'backup.password.rules.lowercase' },
  { key: 'number', labelKey: 'backup.password.rules.number' },
  { key: 'symbol', labelKey: 'backup.password.rules.symbol' },
] as const

export type PasswordChecks = Record<string, boolean>

export function getPasswordStrength(password: string): {
  checks: PasswordChecks
  score: number
  valid: boolean
  labelKey: string
} {
  const { checks, score, valid } = getBackupPasswordStrength(password)
  return { checks, score, valid, labelKey: STRENGTH_LABEL_KEYS[score] || STRENGTH_LABEL_KEYS[0] }
}
