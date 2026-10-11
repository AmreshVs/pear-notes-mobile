import { NativeModule, requireNativeModule } from 'expo'

import {
  CreatePdfFromImagesOptions,
  CreatePdfFromImagesResult,
  PdfTextOptions,
  PdfTextResult,
  PdfThumbnailOptions,
  PdfThumbnailResult,
} from './ExpoPdfTools.types'

declare class ExpoPdfToolsModule extends NativeModule {
  createPdfFromImages(options: CreatePdfFromImagesOptions): Promise<CreatePdfFromImagesResult>
  getPdfThumbnail(options: PdfThumbnailOptions): Promise<PdfThumbnailResult>
  getPdfText(options: PdfTextOptions): Promise<PdfTextResult>
}

export default requireNativeModule<ExpoPdfToolsModule>('ExpoPdfTools')
