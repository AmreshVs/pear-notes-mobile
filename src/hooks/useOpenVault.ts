import { useSelector } from 'react-redux'

import { getVaults } from '@pear-notes/core/store/slices/vaultsSlice.js'

import type { Vault } from '@/lib/vaults.types'

export function useOpenVault() {
  const vaults = useSelector(getVaults) as Vault[]
  const openVault = vaults.find((vault) => vault.current)
  return { openVault, hasSeveralVaults: vaults.length > 1 }
}
