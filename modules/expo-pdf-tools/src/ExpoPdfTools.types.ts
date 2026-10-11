export interface CreatePdfFromImagesOptions {
  imagePaths: string[]
  outputPath: string
}

export interface CreatePdfFromImagesResult {
  uri: string
  pageCount: number
}

export interface PdfThumbnailOptions {
  url: string
  outputPath: string
  maxWidth?: number
  pageIndex?: number
  allowUpscale?: boolean
}

export interface PdfThumbnailResult {
  uri: string
  width: number
  height: number
  pageCount: number
}

export type PdfTextOptions = {
  url: string
  maxPages?: number
  maxChars?: number
}

export type PdfTextResult = {
  text: string
  pageCount: number
}
