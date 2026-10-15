import { Linking, PermissionsAndroid, Platform } from 'react-native'
import type { TFunction } from 'i18next'

import { BackgroundSyncMode, setBackgroundSyncMode } from '@/lib/backgroundSync'
import { applyBackgroundSyncMode } from '@/lib/backgroundSyncTask'

import { openBatteryOptimizationSettings } from '../../modules/expo-background-service/src'

export function switchBackgroundSyncMode(mode: BackgroundSyncMode): void {
  setBackgroundSyncMode(mode)
  applyBackgroundSyncMode(mode)
}

export async function requestAlwaysOnNotificationPermission(t: TFunction): Promise<boolean> {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      {
        title: t('sync.backgroundSync.permissionTitle'),
        message: t('sync.backgroundSync.permissionDescription'),
        buttonNeutral: t('backup.notificationPermissionAskMeLater'),
        buttonNegative: t('backup.notificationPermissionCancel'),
        buttonPositive: t('backup.notificationPermissionOK'),
      },
    )
    return granted === PermissionsAndroid.RESULTS.GRANTED
  } catch (err) {
    console.warn(err)
    return false
  }
}

export async function enableAlwaysOnSync(t: TFunction): Promise<boolean> {
  if (!(await requestAlwaysOnNotificationPermission(t))) return false
  switchBackgroundSyncMode('always-on')
  return true
}

export function openBackgroundSyncSystemSettings(): void {
  if (Platform.OS === 'android') openBatteryOptimizationSettings()
  else Linking.openSettings().catch(() => {})
}
