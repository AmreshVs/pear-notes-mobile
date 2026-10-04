import type { DeviceStorageBreakdown, VaultUsage } from '@/utils/storageBar'

export type DeviceStorageOverviewProps = {
  total: number
  measured: boolean
  vaultUsage: VaultUsage[]
  breakdown: DeviceStorageBreakdown
  isClearingCache: boolean
  isDeletingOldVaults: boolean
  onClearCache: () => void
  onDeleteOldVaults: () => void
  onOpenAiModels: () => void
  onOpenVaultStorage: () => void
  onRemoveAllData: () => void
}
