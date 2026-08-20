import { backendApi } from '@pear-notes/core/backend/api.js'

export type BackgroundSyncMode = 'off' | 'periodic' | 'always-on'

export const BACKGROUND_SYNC_MODE_KEY = 'backgroundSyncMode'
const DEFAULT_MODE: BackgroundSyncMode = 'off'

let cachedMode: BackgroundSyncMode = DEFAULT_MODE

export function getCachedBackgroundSyncMode(): BackgroundSyncMode {
  return cachedMode
}

export async function getBackgroundSyncMode(): Promise<BackgroundSyncMode> {
  try {
    const value = await backendApi.getPreference({ key: BACKGROUND_SYNC_MODE_KEY })
    cachedMode =
      value === 'off' || value === 'periodic' || value === 'always-on' ? value : DEFAULT_MODE
    return cachedMode
  } catch {
    return cachedMode
  }
}

export async function setBackgroundSyncMode(mode: BackgroundSyncMode): Promise<void> {
  cachedMode = mode
  try {
    await backendApi.updatePreference({ key: BACKGROUND_SYNC_MODE_KEY, value: mode })
  } catch {}
}
