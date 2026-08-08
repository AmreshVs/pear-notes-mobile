import { PermissionsAndroid, Platform } from 'react-native'
import * as ExpoBackgroundService from 'expo-background-service'

const MAX_PROGRESS = 100

export type NotificationPermissionStrings = {
  title: string
  message: string
  buttonNeutral: string
  buttonNegative: string
  buttonPositive: string
}

let notificationPermissionAsked = false
let serviceActive = false

export function isBackupServiceActive(): boolean {
  return serviceActive
}

async function ensureNotificationPermission(strings: NotificationPermissionStrings): Promise<void> {
  try {
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    )
    if (granted || notificationPermissionAsked) return
    notificationPermissionAsked = true
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS, strings)
  } catch (e) {
    console.warn('[backgroundService] notification permission', e)
  }
}

export async function startBackupForegroundService(
  title: string,
  message: string,
  strings: NotificationPermissionStrings,
): Promise<boolean> {
  if (Platform.OS !== 'android') return false
  await ensureNotificationPermission(strings)
  try {
    ExpoBackgroundService.startService(title, message, MAX_PROGRESS)
    serviceActive = true
    return true
  } catch (e) {
    console.warn('[backgroundService] start failed', e)
    return false
  }
}

export function updateBackupForegroundService(
  title: string,
  progress: number,
  message: string,
): void {
  if (!serviceActive) return
  try {
    ExpoBackgroundService.updateService(title, progress, message, MAX_PROGRESS)
  } catch (e) {
    console.warn('[backgroundService] update failed', e)
  }
}

export function stopBackupForegroundService(
  completionTitle?: string,
  completionMessage?: string,
): void {
  if (!serviceActive) return
  serviceActive = false
  try {
    ExpoBackgroundService.stopService(completionTitle, completionMessage)
  } catch (e) {
    console.warn('[backgroundService] stop failed', e)
  }
}
