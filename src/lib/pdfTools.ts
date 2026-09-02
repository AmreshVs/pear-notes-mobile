import * as Crypto from 'expo-crypto'
import * as FileSystem from 'expo-file-system/legacy'

import { HYPERDRIVE_URL_PREFIX } from '@pear-notes/core/constant.js'

import { PDF_THUMBNAIL_CACHE_DIR } from '@/constants/constants'
import {
  cleanupCachedAttachment,
  downloadToCache,
  toBackendPath,
} from '@/lib/noteAttachmentManager'

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
const PDF_THUMBNAIL_MEMORY_LIMIT = 12
const SCAN_PDF_PREFIX = 'scan-'
const PAGE_COUNT_EXTENSION = '.pages'
const THUMBNAIL_EXTENSION = '.jpg'

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

const memoryCache = new Map<string, PdfThumbnail>()
const pending = new Map<string, Promise<PdfThumbnail | null>>()

function rememberThumbnail(url: string, thumbnail: PdfThumbnail) {
  memoryCache.set(url, thumbnail)
  if (memoryCache.size > PDF_THUMBNAIL_MEMORY_LIMIT) {
    const oldest = memoryCache.keys().next().value
    if (oldest) memoryCache.delete(oldest)
  }
}

export function isPdfAttachment(fileName?: string | null, fileType?: string | null): boolean {
  if (fileType === PDF_MIME_TYPE) return true
  return typeof fileName === 'string' && fileName.toLowerCase().endsWith('.pdf')
}

async function thumbnailCacheDir(): Promise<string | null> {
  const cacheDirectory = FileSystem.cacheDirectory
  if (!cacheDirectory) return null
  const dir = `${cacheDirectory}${PDF_THUMBNAIL_CACHE_DIR}/`
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {})
  return dir
}

function attachmentIdentity(url: string): string {
  const queryIndex = url.indexOf('?')
  if (queryIndex !== -1 && url.slice(queryIndex).includes('blob=')) {
    return `${HYPERDRIVE_URL_PREFIX}/${url.slice(queryIndex)}`
  }
  return url
}

async function cacheKeyFor(url: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, attachmentIdentity(url))
}

async function readCachedThumbnail(dir: string, key: string): Promise<PdfThumbnail | null> {
  const imageUri = `${dir}${key}${THUMBNAIL_EXTENSION}`
  const info = await FileSystem.getInfoAsync(imageUri)
  if (!info.exists) return null
  const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' })
  const pageCount = await FileSystem.readAsStringAsync(`${dir}${key}${PAGE_COUNT_EXTENSION}`).catch(
    () => '0',
  )
  return { dataUri: `data:image/jpeg;base64,${base64}`, pageCount: Number(pageCount) || 0 }
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

async function buildPdfThumbnail(url: string, fileName: string): Promise<PdfThumbnail | null> {
  const dir = await thumbnailCacheDir()
  if (!dir) return null

  const key = await cacheKeyFor(url)
  const cached = await readCachedThumbnail(dir, key).catch(() => null)
  if (cached) return cached

  const pdfTools = await loadPdfTools()
  if (!pdfTools) return null

  const localPdfUri = await downloadToCache(url, fileName)
  try {
    const imageUri = `${dir}${key}${THUMBNAIL_EXTENSION}`
    const { pageCount } = await pdfTools.getPdfThumbnail({
      url: toBackendPath(localPdfUri),
      outputPath: toBackendPath(imageUri),
      maxWidth: PDF_THUMBNAIL_MAX_WIDTH,
    })
    await FileSystem.writeAsStringAsync(`${dir}${key}${PAGE_COUNT_EXTENSION}`, String(pageCount))
    const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' })
    return { dataUri: `data:image/jpeg;base64,${base64}`, pageCount }
  } finally {
    await cleanupCachedAttachment(localPdfUri)
  }
}

export async function getPdfThumbnail(url: string, fileName: string): Promise<PdfThumbnail | null> {
  const identity = attachmentIdentity(url)
  const remembered = memoryCache.get(identity)
  if (remembered) return remembered

  const inFlight = pending.get(identity)
  if (inFlight) return inFlight

  const request = buildPdfThumbnail(url, fileName)
    .then((thumbnail) => {
      if (thumbnail) rememberThumbnail(identity, thumbnail)
      return thumbnail
    })
    .finally(() => {
      pending.delete(identity)
    })
  pending.set(identity, request)
  return request
}
