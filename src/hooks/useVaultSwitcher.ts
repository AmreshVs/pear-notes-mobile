import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

import { isMultiVaultEnabled } from '@pear-notes/core/constant.js'
import {
  getCanAddVault,
  getCurrentVault,
  getHasMultipleVaults,
  getVaultPending,
  getVaults,
} from '@pear-notes/core/store/slices/vaultsSlice.js'

import { getVaultLabel } from '@/lib/vaultLabels'
import type { Vault } from '@/lib/vaults.types'

export const VAULTS_SETTINGS_ROUTE = '/settings/vaults'
export const JOIN_VAULT_ROUTE = '/settings/vaults/join'

export function useVaultSwitcher() {
  const vaults = useSelector(getVaults) as Vault[]
  const currentVault = useSelector(getCurrentVault) as Vault | null
  const hasMultipleVaults = useSelector(getHasMultipleVaults) as boolean
  const pending = useSelector(getVaultPending)
  const canAdd = useSelector(getCanAddVault) as boolean
  const [sheetOpen, setSheetOpen] = useState(false)

  return {
    vaults,
    currentVault,
    visible: isMultiVaultEnabled() && hasMultipleVaults,
    busy: !!pending,
    canAdd,
    sheetOpen,
    setSheetOpen,
  }
}

export function useVaultNavTitle(fallback: string): string {
  const { t } = useTranslation()
  const currentVault = useSelector(getCurrentVault) as Vault | null
  const hasMultipleVaults = useSelector(getHasMultipleVaults) as boolean
  if (!isMultiVaultEnabled() || !hasMultipleVaults) return fallback
  return getVaultLabel(currentVault, t)
}
