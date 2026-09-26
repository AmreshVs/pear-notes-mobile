import type { TFunction } from 'i18next'

import { VAULT_ERROR } from '@pear-notes/core/constant.js'

import type { Vault } from '@/lib/vaults.types'

const VAULT_ERROR_KEYS: Record<string, string> = {
  [VAULT_ERROR.EMPTY_NAME]: 'vaults.errors.emptyName',
  [VAULT_ERROR.MAX_VAULTS]: 'vaults.errors.maxVaults',
  [VAULT_ERROR.LAST_VAULT]: 'vaults.errors.lastVault',
  [VAULT_ERROR.BUSY]: 'vaults.errors.busy',
  [VAULT_ERROR.SYNC_LEADER]: 'vaults.errors.syncLeader',
  [VAULT_ERROR.MISSING_MEDIA]: 'vaults.errors.missingMedia',
  [VAULT_ERROR.NOTHING_TO_MOVE]: 'vaults.errors.nothingToMove',
}

const FALLBACK_ERROR_KEY = 'vaults.errors.openFailed'

export function getVaultLabel(vault: Vault | null | undefined, t: TFunction): string {
  return vault?.name || t('vaults.defaultName')
}

export function getVaultInitial(label: string): string {
  return label.trim().charAt(0).toUpperCase()
}

export function getVaultErrorKey(code: string | null): string | null {
  if (!code) return null
  return VAULT_ERROR_KEYS[code] ?? FALLBACK_ERROR_KEY
}
