import * as FileSystem from 'expo-file-system/legacy'

import {
  cleanupCachedAttachment,
  downloadToCache,
  toBackendPath,
} from '@/lib/noteAttachmentManager'
import {
  notifyThumbnailWritten,
  requestThumbnail,
  type ThumbnailFile,
  thumbnailPath,
  writePageCount,
} from '@/lib/thumbnailCache'

export const PDF_MIME_TYPE = 'application/pdf'

let pdfToolsModule: any | null | undefined

async function loadPdfTools() {
  if (pdfToolsModule === undefined) {
    try {
      pdfToolsModule = (await import('../../modules/expo-pdf-tools')).default
    } catch {
      pdfToolsModule = null
    }
  }
  return pdfToolsModule
}

const PDF_THUMBNAIL_MAX_WIDTH = 360
const SCAN_PDF_PREFIX = 'scan-'
export const UNCACHED_THUMBNAIL_PREFIX = 'pdf-preview-'

export type ScanPdfResult = {
  uri: string
  path: string
  fileName: string
  fileSize: number
  pageCount: number
}

export type PdfThumbnail = {
  dataUri: string
  pageCount: number
}

export function isPdfAttachment(fileName?: string | null, fileType?: string | null): boolean {
  if (fileType === PDF_MIME_TYPE) return true
  return typeof fileName === 'string' && fileName.toLowerCase().endsWith('.pdf')
}

export async function createScanPdf(imageUris: string[], baseName: string): Promise<ScanPdfResult> {
  const cacheDirectory = FileSystem.cacheDirectory
  if (!cacheDirectory) throw new Error('No cache directory available')

  const pdfTools = await loadPdfTools()
  if (!pdfTools) throw new Error('PDF_TOOLS_UNAVAILABLE')

  const fileName = `${SCAN_PDF_PREFIX}${Date.now()}.pdf`
  const outputPath = `${cacheDirectory}${fileName}`
  const { uri, pageCount } = await pdfTools.createPdfFromImages({
    imagePaths: imageUris.map(toBackendPath),
    outputPath: toBackendPath(outputPath),
  })

  const info = await FileSystem.getInfoAsync(uri)
  return {
    uri,
    path: toBackendPath(uri),
    fileName: baseName ? `${baseName}.pdf` : fileName,
    fileSize: (info as { size?: number }).size || 0,
    pageCount,
  }
}

async function renderThumbnail(
  identity: string,
  localPdfUri: string,
  dir: string,
  key: string,
): Promise<ThumbnailFile | null> {
  const pdfTools = await loadPdfTools()
  if (!pdfTools) return null

  const fileUri = thumbnailPath(dir, key)
  const { pageCount } = await pdfTools.getPdfThumbnail({
    url: toBackendPath(localPdfUri),
    outputPath: toBackendPath(fileUri),
    maxWidth: PDF_THUMBNAIL_MAX_WIDTH,
  })
  await writePageCount(dir, key, pageCount)
  notifyThumbnailWritten(identity)
  return { fileUri, pageCount }
}

const OCR_PAGE_WIDTH = 1240

export async function renderPdfPageForOcr(
  localPdfUri: string,
  pageIndex: number,
): Promise<{ uri: string; pageCount: number } | null> {
  const pdfTools = await loadPdfTools()
  const cacheDirectory = FileSystem.cacheDirectory
  if (!pdfTools || !cacheDirectory) return null
  const outputUri = `${cacheDirectory}ocr-page-${Date.now()}-${pageIndex}.jpg`
  const { uri, pageCount } = await pdfTools.getPdfThumbnail({
    url: toBackendPath(localPdfUri),
    outputPath: toBackendPath(outputUri),
    maxWidth: OCR_PAGE_WIDTH,
    pageIndex,
    allowUpscale: true,
  })
  return { uri, pageCount }
}

/**
 * Cache-only lookup, for the notes list. Never loads the native module and never pulls the PDF
 * through the blob server, so scrolling a list of PDF notes costs nothing and is unaffected by the
 * media-transfer hold settings.
 */
export async function getCachedPdfThumbnail(url: string): Promise<ThumbnailFile | null> {
  if (!url) return null
  return requestThumbnail(url, false, async () => null).catch(() => null)
}

/**
 * Renders a thumbnail from a PDF that is already on disk (freshly attached or scanned), so the
 * notes list has one to show without ever fetching. No-op when the entry already exists.
 */
export async function warmPdfThumbnail(
  url: string,
  localPdfUri: string,
  fileName: string,
): Promise<void> {
  if (!url || !localPdfUri || !fileName) return
  await requestThumbnail(url, true, ({ dir, key, identity }) =>
    renderThumbnail(identity, localPdfUri, dir, key),
  ).catch(() => null)
}

async function renderUncachedPdfThumbnail(
  url: string,
  fileName: string,
): Promise<PdfThumbnail | null> {
  const pdfTools = await loadPdfTools()
  const cacheDirectory = FileSystem.cacheDirectory
  if (!pdfTools || !cacheDirectory) return null
  const localPdfUri = await downloadToCache(url, fileName)
  const outputUri = `${cacheDirectory}${UNCACHED_THUMBNAIL_PREFIX}${Date.now()}.jpg`
  try {
    const { pageCount } = await pdfTools.getPdfThumbnail({
      url: toBackendPath(localPdfUri),
      outputPath: toBackendPath(outputUri),
      maxWidth: PDF_THUMBNAIL_MAX_WIDTH,
    })
    const base64 = await FileSystem.readAsStringAsync(outputUri, { encoding: 'base64' })
    return { dataUri: `data:image/jpeg;base64,${base64}`, pageCount }
  } finally {
    await FileSystem.deleteAsync(outputUri, { idempotent: true }).catch(() => {})
    await cleanupCachedAttachment(localPdfUri)
  }
}

/** Editor path: renders on demand (fetching the PDF if needed) and returns an inlineable image. */
export async function getPdfThumbnail(
  url: string,
  fileName: string,
  { cache = true }: { cache?: boolean } = {},
): Promise<PdfThumbnail | null> {
  if (!cache) return renderUncachedPdfThumbnail(url, fileName).catch(() => null)
  const file = await requestThumbnail(url, true, async ({ dir, key, identity }) => {
    const localPdfUri = await downloadToCache(url, fileName)
    try {
      return await renderThumbnail(identity, localPdfUri, dir, key)
    } finally {
      await cleanupCachedAttachment(localPdfUri)
    }
  })
  if (!file) return null
  const base64 = await FileSystem.readAsStringAsync(file.fileUri, { encoding: 'base64' }).catch(
    () => null,
  )
  if (!base64) return null
  return { dataUri: `data:image/jpeg;base64,${base64}`, pageCount: file.pageCount }
}

const PDF_TEXT_MAX_PAGES = 20
const PDF_TEXT_MAX_CHARS = 20000
const PDF_TEXT_CACHE_LIMIT = 64
export const PDF_TEXT_MAX_BYTES = 25 * 1024 * 1024
const pdfTextCache = new Map<string, string>()

export async function readLocalPdfText(localPdfUri: string): Promise<string> {
  const pdfTools = await loadPdfTools()
  if (!pdfTools?.getPdfText) return ''
  const { text } = await pdfTools.getPdfText({
    url: toBackendPath(localPdfUri),
    maxPages: PDF_TEXT_MAX_PAGES,
    maxChars: PDF_TEXT_MAX_CHARS,
  })
  return String(text ?? '').trim()
}

export async function readPdfText(url: string, fileName: string): Promise<string> {
  const cached = pdfTextCache.get(url)
  if (cached !== undefined) return cached
  const localPdfUri = await downloadToCache(url, fileName)
  try {
    const text = await readLocalPdfText(localPdfUri)
    pdfTextCache.set(url, text)
    if (pdfTextCache.size > PDF_TEXT_CACHE_LIMIT) {
      pdfTextCache.delete(pdfTextCache.keys().next().value as string)
    }
    return text
  } finally {
    await cleanupCachedAttachment(localPdfUri)
  }
}
