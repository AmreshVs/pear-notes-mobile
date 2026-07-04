import { backendApi } from '@pear-notes/core/backend/api.js'

export const LOCK_SCREENSHOT_PROTECTION_KEY = 'lockScreenshotProtection'
export const LOCK_SWITCHER_HIDE_KEY = 'lockSwitcherHide'

export async function getLockPrivacyPreference(key: string): Promise<boolean> {
  try {
    const value = await backendApi.getPreference({ key })
    return value !== 'false'
  } catch {
    return true
  }
}

export async function setLockPrivacyPreference(key: string, enabled: boolean): Promise<void> {
  try {
    await backendApi.updatePreference({ key, value: enabled ? 'true' : 'false' })
  } catch {}
}
