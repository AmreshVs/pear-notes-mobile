import { backendApi } from '@pear-notes/core/backend/api.js'
import { HOLD_MEDIA_ON_CELLULAR_KEY } from '@pear-notes/core/constant.js'

export async function getHoldMediaOnCellular(): Promise<boolean> {
  try {
    const value = await backendApi.getPreference({ key: HOLD_MEDIA_ON_CELLULAR_KEY })
    return value === 'true'
  } catch {
    return false
  }
}
