import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import {
  getForceRemovalId,
  getVaults,
  removeVault,
  setForceRemovalId,
} from '@pear-notes/core/store/slices/vaultsSlice.js'

import type { Vault } from '@/lib/vaults.types'

export function useForceVaultRemoval() {
  const dispatch = useDispatch()
  const forceRemovalId = useSelector(getForceRemovalId) as string | null
  const vaults = useSelector(getVaults) as Vault[]
  const vault = forceRemovalId ? (vaults.find((v) => v.id === forceRemovalId) ?? null) : null

  const cancel = useCallback(() => dispatch(setForceRemovalId(null)), [dispatch])
  const confirm = useCallback(() => {
    if (!forceRemovalId) return
    dispatch(removeVault({ id: forceRemovalId, force: true }))
  }, [dispatch, forceRemovalId])

  return { vault, cancel, confirm }
}
