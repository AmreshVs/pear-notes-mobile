import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { router } from 'expo-router'

import { switchVault } from '@pear-notes/core/store/slices/vaultsSlice.js'

import { useVaultSwitcher, VAULTS_SETTINGS_ROUTE } from '@/hooks/useVaultSwitcher'
import { hapticSelection } from '@/lib/haptics'
import type { Vault } from '@/lib/vaults.types'

export function useVaultSheetControls() {
  const dispatch = useDispatch()
  const switcher = useVaultSwitcher()
  const { setSheetOpen } = switcher

  const openSheet = useCallback(() => {
    hapticSelection()
    setSheetOpen(true)
  }, [setSheetOpen])
  const closeSheet = useCallback(() => setSheetOpen(false), [setSheetOpen])

  const handleSelectVault = useCallback(
    (vault: Vault) => {
      setSheetOpen(false)
      dispatch(switchVault({ id: vault.id }))
    },
    [dispatch, setSheetOpen],
  )

  const handleManage = useCallback(() => {
    setSheetOpen(false)
    router.push(VAULTS_SETTINGS_ROUTE as never)
  }, [setSheetOpen])

  return { ...switcher, openSheet, closeSheet, handleSelectVault, handleManage }
}
