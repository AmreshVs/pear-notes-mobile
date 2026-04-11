import { NativeModule, requireNativeModule } from 'expo'

import {
  ExpoNativePreviewOptions,
  ExpoNativeSaveToPhotosOptions,
  ExpoNativeShareOptions,
  ExpoNativeCopyFileOptions,
} from './ExpoNativeShare.types'

declare class ExpoNativeShareModule extends NativeModule {
  share(options: ExpoNativeShareOptions): Promise<void>
  preview(options: ExpoNativePreviewOptions): Promise<void>
  saveToPhotos(options: ExpoNativeSaveToPhotosOptions): Promise<void>
  copyFile(options: ExpoNativeCopyFileOptions): Promise<void>
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ExpoNativeShareModule>('ExpoNativeShare')
