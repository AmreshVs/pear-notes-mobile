import { useCallback } from 'react'
import { useSelector } from 'react-redux'

import { getVaults } from '@pear-notes/core/store/slices/vaultsSlice.js'
import { formatVaultInvite } from '@pear-notes/core/utils.js'

import { useInviteLink } from '@/hooks/useInviteLink'
import type { Vault } from '@/lib/vaults.types'

export function useVaultInviteScreen(defaultName: string) {
  const vaults = useSelector(getVaults) as Vault[]
  const name = vaults.find((vault) => vault.current)?.name || defaultName
  const format = useCallback((invite: string) => formatVaultInvite(invite, name), [name])
  const invite = useInviteLink(format)
  return { name, invite }
}
