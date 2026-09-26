import { VAULT_ACTION } from '@/constants/vaultActions'
import type { Vault } from '@/lib/vaults.types'

import type { ContextMenuItem } from '../../modules/expo-context-menu'

export type VaultMenuLabels = {
  open: string
  rename: string
  remove: string
}

export function buildVaultMenu(
  vault: Vault,
  canRemove: boolean,
  labels: VaultMenuLabels,
): ContextMenuItem[] {
  return [
    ...(vault.current
      ? []
      : [{ id: VAULT_ACTION.open, title: labels.open, systemImage: 'arrow.right.circle' }]),
    { id: VAULT_ACTION.rename, title: labels.rename, systemImage: 'pencil' },
    ...(canRemove
      ? [{ id: VAULT_ACTION.remove, title: labels.remove, systemImage: 'trash', destructive: true }]
      : []),
  ]
}
