import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { router } from 'expo-router'

import { LOCAL_AI_ENABLED } from '@pear-notes/core/store/services/localAiCatalog.js'
import { getLocalAiLoaded, initLocalAi } from '@pear-notes/core/store/slices/localAiSlice.js'
import { getVaults } from '@pear-notes/core/store/slices/vaultsSlice.js'

import { clearCaches } from '@/lib/cacheCleanup'
import { resetAllData } from '@/lib/clearAllData'
import {
  clearTemporaryFiles,
  deleteOldVaults,
  type DeviceStorageSummary,
  measureDeviceStorage,
  measureVaultSizes,
} from '@/lib/deviceStorage'
import { hapticLight, hapticWarning } from '@/lib/haptics'
import type { Vault } from '@/lib/vaults.types'
import { getDeviceStorageBreakdown, type VaultUsage } from '@/utils/storageBar'

export type { VaultUsage }

export const VAULT_STORAGE_ROUTE = '/settings/vault-storage'
const AI_MODELS_ROUTE = '/settings/on-device-ai/models'

export function useDeviceStorage() {
  const dispatch = useDispatch()
  const vaults = useSelector(getVaults) as Vault[]
  const localAiLoaded = useSelector(getLocalAiLoaded) as boolean

  const [summary, setSummary] = useState<DeviceStorageSummary | null>(null)
  const [vaultSizes, setVaultSizes] = useState<Record<string, number>>({})
  const [isClearingCache, setIsClearingCache] = useState(false)
  const [isDeletingOldVaults, setIsDeletingOldVaults] = useState(false)
  const [removeSheetVisible, setRemoveSheetVisible] = useState(false)

  useEffect(() => {
    if (LOCAL_AI_ENABLED && !localAiLoaded) dispatch(initLocalAi())
  }, [dispatch, localAiLoaded])

  const refresh = useCallback(async () => {
    const [nextSummary, nextSizes] = await Promise.all([
      measureDeviceStorage().catch(() => null),
      measureVaultSizes().catch(() => ({})),
    ])
    if (nextSummary) setSummary(nextSummary)
    setVaultSizes(nextSizes)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const vaultUsage = useMemo<VaultUsage[]>(
    () =>
      vaults
        .map((vault) => ({ ...vault, bytes: vaultSizes[vault.id] ?? 0 }))
        .sort((a, b) => Number(b.current) - Number(a.current) || b.bytes - a.bytes),
    [vaultSizes, vaults],
  )

  const breakdown = useMemo(
    () => getDeviceStorageBreakdown(summary, vaultUsage, LOCAL_AI_ENABLED),
    [summary, vaultUsage],
  )

  const handleClearCache = useCallback(async () => {
    hapticLight()
    setIsClearingCache(true)
    try {
      await clearCaches()
      await clearTemporaryFiles()
      await refresh()
    } finally {
      setIsClearingCache(false)
    }
  }, [refresh])

  const handleDeleteOldVaults = useCallback(async () => {
    hapticWarning()
    setIsDeletingOldVaults(true)
    try {
      await deleteOldVaults()
      await refresh()
    } finally {
      setIsDeletingOldVaults(false)
    }
  }, [refresh])

  const openRemoveSheet = useCallback(() => {
    hapticLight()
    setRemoveSheetVisible(true)
  }, [])
  const closeRemoveSheet = useCallback(() => setRemoveSheetVisible(false), [])
  const confirmRemoveAll = useCallback(() => {
    hapticWarning()
    setRemoveSheetVisible(false)
    resetAllData(dispatch)
  }, [dispatch])

  const handleOpenAiModels = useCallback(() => router.push(AI_MODELS_ROUTE as never), [])
  const handleOpenVaultStorage = useCallback(() => router.push(VAULT_STORAGE_ROUTE as never), [])

  return {
    total: summary?.total ?? 0,
    measured: !!summary,
    vaultUsage,
    breakdown,
    isClearingCache,
    isDeletingOldVaults,
    handleClearCache,
    handleDeleteOldVaults,
    handleOpenAiModels,
    handleOpenVaultStorage,
    removeSheetVisible,
    openRemoveSheet,
    closeRemoveSheet,
    confirmRemoveAll,
  }
}
