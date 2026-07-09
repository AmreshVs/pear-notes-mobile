import { backendApi } from '@pear-notes/core/backend/api.js'

export const BACKGROUND_SYNC_ENABLED_KEY = 'backgroundSyncEnabled'

export async function getBackgroundSyncPreference(key: string): Promise<boolean> {
  try {
    const value = await backendApi.getPreference({ key })
    return value === 'true'
  } catch {
    return false
  }
}

export async function setBackgroundSyncPreference(key: string, enabled: boolean): Promise<void> {
  try {
    await backendApi.updatePreference({ key, value: enabled ? 'true' : 'false' })
  } catch {}
}
