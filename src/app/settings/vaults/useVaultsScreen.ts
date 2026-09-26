import { useCallback, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import {
  clearVaultError,
  createVault,
  getCanAddVault,
  getVaultError,
  getVaultPending,
  getVaultPendingId,
  getVaults,
  removeVault,
  renameVault,
  switchVault,
} from '@pear-notes/core/store/slices/vaultsSlice.js'

import type { Vault, VaultAction } from '@/lib/vaults.types'

export type NameDialogState = { mode: 'create' } | { mode: 'rename'; vault: Vault } | null

export function useVaultsScreen() {
  const dispatch = useDispatch()
  const vaults = useSelector(getVaults) as Vault[]
  const pending = useSelector(getVaultPending) as VaultAction | null
  const pendingId = useSelector(getVaultPendingId) as string | null
  const error = useSelector(getVaultError) as string | null
  const canAdd = useSelector(getCanAddVault) as boolean

  const [actionVault, setActionVault] = useState<Vault | null>(null)
  const [removingVault, setRemovingVault] = useState<Vault | null>(null)
  const [nameDialog, setNameDialog] = useState<NameDialogState>(null)

  const busy = !!pending
  const canRemove = vaults.length > 1

  const openVault = useCallback(
    (vault: Vault) => {
      if (vault.current || busy) return
      dispatch(switchVault({ id: vault.id }))
    },
    [busy, dispatch],
  )

  const submitName = useCallback(
    (name: string) => {
      if (!name.trim() || !nameDialog) return
      dispatch(clearVaultError())
      if (nameDialog.mode === 'create') dispatch(createVault({ name }))
      else dispatch(renameVault({ id: nameDialog.vault.id, name }))
      setNameDialog(null)
    },
    [dispatch, nameDialog],
  )

  const confirmRemove = useCallback(
    (vault: Vault) => {
      setRemovingVault(null)
      dispatch(removeVault({ id: vault.id }))
    },
    [dispatch],
  )

  return {
    vaults,
    pending,
    pendingId,
    error,
    canAdd,
    canRemove,
    busy,
    actionVault,
    setActionVault,
    removingVault,
    setRemovingVault,
    nameDialog,
    setNameDialog,
    openVault,
    submitName,
    confirmRemove,
  }
}
