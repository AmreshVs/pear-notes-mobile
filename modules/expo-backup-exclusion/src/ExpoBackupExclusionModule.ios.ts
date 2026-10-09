import { NativeModule, requireNativeModule } from 'expo'

declare class ExpoBackupExclusionModule extends NativeModule {
  excludeFromBackup(path: string): Promise<boolean>
}

const nativeModule = requireNativeModule<ExpoBackupExclusionModule>('ExpoBackupExclusion')

export function excludeFromBackup(path: string): Promise<boolean> {
  return nativeModule.excludeFromBackup(path)
}
