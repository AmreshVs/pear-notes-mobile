import { useState } from 'react'
import { useSelector } from 'react-redux'

import { isMultiVaultEnabled } from '@pear-notes/core/constant.js'
import {
  getCanAddVault,
  getCurrentVault,
  getHasMultipleVaults,
  getVaultPending,
  getVaults,
} from '@pear-notes/core/store/slices/vaultsSlice.js'

import type { Vault } from '@/lib/vaults.types'

export const VAULTS_SETTINGS_ROUTE = '/settings/vaults'
export const JOIN_VAULT_ROUTE = '/settings/vaults/join'
export const DEVICES_ROUTE = '/settings/devices'
export const ADD_DEVICE_ROUTE = '/settings/devices/add'

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
