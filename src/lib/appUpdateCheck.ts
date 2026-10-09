import { Platform } from 'react-native'
import Constants from 'expo-constants'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { APP_UPDATE_MANIFEST_URL } from '@pear-notes/core/constant.js'
import { getUpdateStatus } from '@pear-notes/core/utils.js'

import { APP_UPDATE_STORE_HOSTS } from '@/constants/constants'

export type AppUpdateStatus = {
  mandatory: boolean
  updateAvailable: boolean
  latestVersion: string
  storeUrl: string
}

const APP_UPDATE_DISMISSED_VERSION_KEY = 'appUpdateDismissedVersion'

function trustedStoreUrl(url: unknown, platformKey: string): string | null {
  if (typeof url !== 'string') return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return null
    return parsed.hostname === APP_UPDATE_STORE_HOSTS[platformKey] ? url : null
  } catch {
    return null
  }
}

export async function checkAppUpdate(): Promise<AppUpdateStatus | null> {
  try {
    const res = await fetch(APP_UPDATE_MANIFEST_URL, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null

    const manifest = await res.json()
    const platformKey = Platform.OS === 'ios' ? 'ios' : 'android'
    const entry = manifest?.[platformKey]
    if (!entry) return null
    const storeUrl = trustedStoreUrl(entry.storeUrl, platformKey)
    if (!storeUrl) return null

    const currentVersion = Constants.expoConfig?.version ?? '0.0.0'
    const { mandatory, updateAvailable } = getUpdateStatus({
      currentVersion,
      latestVersion: entry.latestVersion,
      minimumVersion: entry.minimumVersion,
    })

    return {
      mandatory,
      updateAvailable,
      latestVersion: entry.latestVersion,
      storeUrl,
    }
  } catch {
    return null
  }
}

export async function getAppUpdateDismissedVersion(): Promise<string | null> {
  try {
    const value = await backendApi.getPreference({ key: APP_UPDATE_DISMISSED_VERSION_KEY })
    return value || null
  } catch {
    return null
  }
}

export async function setAppUpdateDismissedVersion(version: string): Promise<void> {
  try {
    await backendApi.updatePreference({ key: APP_UPDATE_DISMISSED_VERSION_KEY, value: version })
  } catch {}
}
