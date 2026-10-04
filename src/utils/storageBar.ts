import { DEVICE_STORAGE } from '@pear-notes/core/store/services/deviceStorage.js'

import type { DeviceStorageSummary } from '@/lib/deviceStorage'
import type { Vault } from '@/lib/vaults.types'

export type VaultUsage = Vault & { bytes: number }

export type StorageTone = 'openVault' | 'otherVault' | 'ai' | 'app'

export type StorageBarSegment = { key: string; share: number; tone: StorageTone }

export type DeviceStorageBreakdown = {
  segments: StorageBarSegment[]
  aiBytes: number
  appBytes: number
  cacheBytes: number
  dataBytes: number
  oldVaultBytes: number
  showAi: boolean
}

const MIN_SEGMENT_SHARE = 0.015

const APP_CATEGORIES = [
  DEVICE_STORAGE.APP,
  DEVICE_STORAGE.NOTES,
  DEVICE_STORAGE.CACHE,
  DEVICE_STORAGE.PREVIEWS,
  DEVICE_STORAGE.LOGS,
  DEVICE_STORAGE.OTHER,
]

export function getDeviceStorageBreakdown(
  summary: DeviceStorageSummary | null,
  vaults: VaultUsage[],
  showAiModels: boolean,
): DeviceStorageBreakdown {
  const byCategory = summary?.byCategory ?? {}
  const vaultBytes = vaults.reduce((sum, vault) => sum + vault.bytes, 0)
  const aiBytes = byCategory[DEVICE_STORAGE.AI_MODELS] ?? 0
  const oldVaultBytes = byCategory[DEVICE_STORAGE.OLD_VAULTS] ?? 0
  const categoryBytes = APP_CATEGORIES.reduce((sum, key) => sum + (byCategory[key] ?? 0), 0)
  const appBytes = Math.max(0, categoryBytes - vaultBytes)

  const parts: { key: string; bytes: number; tone: StorageTone }[] = vaults.map((vault) => ({
    key: vault.id,
    bytes: vault.bytes,
    tone: vault.current ? 'openVault' : 'otherVault',
  }))
  parts.push({ key: DEVICE_STORAGE.AI_MODELS, bytes: aiBytes, tone: 'ai' })
  parts.push({ key: DEVICE_STORAGE.APP, bytes: appBytes + oldVaultBytes, tone: 'app' })
  const partsTotal = parts.reduce((sum, part) => sum + part.bytes, 0)
  const segments: StorageBarSegment[] =
    partsTotal > 0
      ? parts
          .filter((part) => part.bytes > 0)
          .map((part) => ({
            key: part.key,
            tone: part.tone,
            share: Math.max(part.bytes / partsTotal, MIN_SEGMENT_SHARE),
          }))
      : []

  return {
    segments,
    aiBytes,
    appBytes,
    cacheBytes: byCategory[DEVICE_STORAGE.CACHE] ?? 0,
    dataBytes: Math.max(0, appBytes - (byCategory[DEVICE_STORAGE.APP] ?? 0)),
    oldVaultBytes,
    showAi: showAiModels || aiBytes > 0,
  }
}
