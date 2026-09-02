import { NativeModule, requireNativeModule } from 'expo'

import {
  CreatePdfFromImagesOptions,
  CreatePdfFromImagesResult,
  PdfThumbnailOptions,
  PdfThumbnailResult,
} from './ExpoPdfTools.types'

declare class ExpoPdfToolsModule extends NativeModule {
  createPdfFromImages(options: CreatePdfFromImagesOptions): Promise<CreatePdfFromImagesResult>
  getPdfThumbnail(options: PdfThumbnailOptions): Promise<PdfThumbnailResult>
}

export default requireNativeModule<ExpoPdfToolsModule>('ExpoPdfTools')
