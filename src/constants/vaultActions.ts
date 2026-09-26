export const VAULT_ACTION = {
  open: 'open',
  rename: 'rename',
  remove: 'remove',
} as const

export type VaultActionId = (typeof VAULT_ACTION)[keyof typeof VAULT_ACTION]
