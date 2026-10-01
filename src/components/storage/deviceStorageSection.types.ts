import type { DeviceStorageSummary } from '@/lib/deviceStorage'

export type DeviceStorageSectionProps = {
  summary: DeviceStorageSummary | null
  showAiModels: boolean
  isClearingCache: boolean
  isDeletingOldVaults: boolean
  onClearCache: () => void
  onDeleteOldVaults: () => void
  onOpenAiModels: () => void
}
