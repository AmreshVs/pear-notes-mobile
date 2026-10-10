import { NativeModule, requireOptionalNativeModule } from 'expo'

import { ReminderItem } from './ExpoReminders.types'

declare class ExpoRemindersModule extends NativeModule {
  requestPermission(): Promise<boolean | { granted: boolean }>
  schedule(items: ReminderItem[]): Promise<number>
  cancelAll(): Promise<void>
  speak(text: string, language: string | null): Promise<boolean>
  stopSpeaking(): void
  isSpeaking(): boolean
  getInitialUrl?(): string | null
}

export default requireOptionalNativeModule<ExpoRemindersModule>('ExpoReminders')
