import { requireNativeModule } from 'expo-modules-core'

const ExpoBackgroundService = requireNativeModule('ExpoBackgroundService')

export function startService(title: string, message: string, maxProgress: number): void {
  ExpoBackgroundService.start(title, message, maxProgress)
}

export function updateService(progress: number, message: string, maxProgress: number): void {
  ExpoBackgroundService.update(progress, message, maxProgress)
}

export function stopService(): void {
  ExpoBackgroundService.stop()
}
