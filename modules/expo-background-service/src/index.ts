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

export function stopService(completionTitle?: string, completionMessage?: string): void {
  ExpoBackgroundService.stop(completionTitle ?? null, completionMessage ?? null)
}

export function isIgnoringBatteryOptimizations(): boolean {
  if (Platform.OS !== 'android') return true
  try {
    return ExpoBackgroundService.isIgnoringBatteryOptimizations() !== false
  } catch {
    return true
  }
}

export function openBatteryOptimizationSettings(): void {
  if (Platform.OS !== 'android') return
  try {
    ExpoBackgroundService.openBatteryOptimizationSettings()
  } catch {}
}
