import { backendApi } from '@pear-notes/core/backend/api.js'

export type BackgroundSyncMode = 'off' | 'periodic' | 'always-on'

export const BACKGROUND_SYNC_MODE_KEY = 'backgroundSyncMode'
const DEFAULT_MODE: BackgroundSyncMode = 'off'

export async function getBackgroundSyncMode(): Promise<BackgroundSyncMode> {
  try {
    const value = await backendApi.getPreference({ key: BACKGROUND_SYNC_MODE_KEY })
    if (value === 'off' || value === 'periodic' || value === 'always-on') return value
    return DEFAULT_MODE
  } catch {
    return DEFAULT_MODE
  }
}

export async function setBackgroundSyncMode(mode: BackgroundSyncMode): Promise<void> {
  try {
    await backendApi.updatePreference({ key: BACKGROUND_SYNC_MODE_KEY, value: mode })
  } catch {}
}
