import { backendApi } from '@pear-notes/core/backend/api.js'
import { MEDIA_SYNC_PAUSED_KEY, METERED_CONNECTION_KEY } from '@pear-notes/core/constant.js'

export { MEDIA_SYNC_PAUSED_KEY, METERED_CONNECTION_KEY }

export const HOLD_MEDIA_ON_CELLULAR_KEY = 'holdMediaOnCellular'

export async function getHoldMediaOnCellular(): Promise<boolean> {
  try {
    const value = await backendApi.getPreference({ key: HOLD_MEDIA_ON_CELLULAR_KEY })
    return value !== 'false'
  } catch {
    return true
  }
}

export async function getMediaSyncFlag(key: string): Promise<boolean> {
  try {
    const value = await backendApi.getPreference({ key })
    return value === 'true'
  } catch {
    return false
  }
}

export async function setMediaSyncFlag(key: string, enabled: boolean): Promise<void> {
  try {
    await backendApi.updatePreference({ key, value: enabled ? 'true' : 'false' })
  } catch (e) {
    console.error('setMediaSyncFlag failed', e)
  }
}
