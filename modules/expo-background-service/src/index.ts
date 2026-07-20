import { Platform } from 'react-native'
import { requireNativeModule } from 'expo-modules-core'

const ExpoBackgroundService =
  Platform.OS === 'android' ? requireNativeModule('ExpoBackgroundService') : {}

export function startService(title: string, message: string, maxProgress: number): void {
  ExpoBackgroundService.start(title, message, maxProgress)
}

export function updateService(
  title: string,
  progress: number,
  message: string,
  maxProgress: number,
): void {
  ExpoBackgroundService.update(title, progress, message, maxProgress)
}

export function stopService(): void {
  ExpoBackgroundService.stop()
}
