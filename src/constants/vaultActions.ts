export const VAULT_ACTION = {
  open: 'open',
  rename: 'rename',
  remove: 'remove',
} as const

export type VaultActionId = (typeof VAULT_ACTION)[keyof typeof VAULT_ACTION]

export const JOIN_CHOICE = {
  separate: 'separate',
  combine: 'combine',
} as const
