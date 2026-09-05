import * as Crypto from 'expo-crypto'
import * as FileSystem from 'expo-file-system/legacy'

import { HYPERDRIVE_URL_PREFIX } from '@pear-notes/core/constant.js'

import { ATTACHMENT_THUMBNAIL_CACHE_DIR } from '@/constants/constants'

/**
 * Shared store for the small derived images the notes list draws — one page-1 render per PDF, one
 * downscaled copy per image attachment. Entries are keyed by attachment identity and reclaimed by
 * the reference sweep in cacheCleanup, never by age: the list depends on them.
 */
export type ThumbnailFile = {
  fileUri: string
  pageCount: number
}

const MEMORY_LIMIT = 24
const THUMBNAIL_EXTENSION = '.jpg'
const PAGE_COUNT_EXTENSION = '.pages'

const memoryCache = new Map<string, ThumbnailFile>()

type PendingRequest = {
  promise: Promise<ThumbnailFile | null>
  allowFetch: boolean
}

const pending = new Map<string, PendingRequest>()

// A thumbnail is usually rendered while a note is open, long after the list row read the cache and
// found nothing. Without a signal the row stays blank until the next app start.
type WriteListener = (identity: string) => void
const writeListeners = new Set<WriteListener>()

export function subscribeThumbnailWrites(listener: WriteListener): () => void {
  writeListeners.add(listener)
  return () => {
    writeListeners.delete(listener)
  }
}

export function notifyThumbnailWritten(identity: string) {
  for (const listener of [...writeListeners]) listener(identity)
}

// The blob server's port changes between runs, so the port-bearing form of an attachment URL is
// useless as a cache identity. Anything carrying a `blob=` query is folded back to the stable
// hyperdrive form, which is what the note HTML stores.
export function thumbnailIdentity(url: string): string {
  if (!url) return ''
  const queryIndex = url.indexOf('?')
  if (queryIndex !== -1 && url.slice(queryIndex).includes('blob=')) {
    return `${HYPERDRIVE_URL_PREFIX}/${url.slice(queryIndex)}`
  }
  return url
}

export async function thumbnailCacheKey(url: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, thumbnailIdentity(url))
}

export function thumbnailFileNames(key: string): string[] {
  return [`${key}${THUMBNAIL_EXTENSION}`, `${key}${PAGE_COUNT_EXTENSION}`]
}

export async function thumbnailCacheDir(): Promise<string | null> {
  const cacheDirectory = FileSystem.cacheDirectory
  if (!cacheDirectory) return null
  const dir = `${cacheDirectory}${ATTACHMENT_THUMBNAIL_CACHE_DIR}/`
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {})
  return dir
}

export function thumbnailPath(dir: string, key: string): string {
  return `${dir}${key}${THUMBNAIL_EXTENSION}`
}

export function rememberThumbnail(identity: string, thumbnail: ThumbnailFile) {
  memoryCache.set(identity, thumbnail)
  if (memoryCache.size > MEMORY_LIMIT) {
    const oldest = memoryCache.keys().next().value
    if (oldest) memoryCache.delete(oldest)
  }
}

export async function readCachedThumbnail(dir: string, key: string): Promise<ThumbnailFile | null> {
  const fileUri = thumbnailPath(dir, key)
  const info = await FileSystem.getInfoAsync(fileUri)
  if (!info.exists) return null
  const pageCount = await FileSystem.readAsStringAsync(`${dir}${key}${PAGE_COUNT_EXTENSION}`).catch(
    () => '0',
  )
  return { fileUri, pageCount: Number(pageCount) || 0 }
}

export async function writePageCount(dir: string, key: string, pageCount: number) {
  await FileSystem.writeAsStringAsync(`${dir}${key}${PAGE_COUNT_EXTENSION}`, String(pageCount))
}

type Resolver = (context: {
  dir: string
  key: string
  identity: string
}) => Promise<ThumbnailFile | null>

/**
 * Runs `resolve` for an attachment at most once at a time, sharing the result with every other
 * caller. `allowFetch` says whether the caller may pull the attachment through the blob server; a
 * cache-only request in flight must not satisfy a caller that is allowed to render, or the note
 * that triggered the render would silently get nothing.
 */
export function requestThumbnail(
  url: string,
  allowFetch: boolean,
  resolve: Resolver,
): Promise<ThumbnailFile | null> {
  const identity = thumbnailIdentity(url)
  if (!identity) return Promise.resolve(null)

  const remembered = memoryCache.get(identity)
  if (remembered) return Promise.resolve(remembered)

  const inFlight = pending.get(identity)
  if (inFlight && (inFlight.allowFetch || !allowFetch)) return inFlight.promise

  const promise = (async () => {
    const dir = await thumbnailCacheDir()
    if (!dir) return null
    const key = await thumbnailCacheKey(url)
    const cached = await readCachedThumbnail(dir, key).catch(() => null)
    if (cached) return cached
    if (!allowFetch) return null
    return resolve({ dir, key, identity })
  })()
    .then((thumbnail) => {
      if (thumbnail) rememberThumbnail(identity, thumbnail)
      return thumbnail
    })
    .finally(() => {
      if (pending.get(identity)?.promise === promise) pending.delete(identity)
    })

  pending.set(identity, { promise, allowFetch })
  return promise
}

/** Drops a thumbnail the moment its attachment is deleted, rather than leaving it for the sweep. */
export async function deleteThumbnail(url: string): Promise<void> {
  if (!url) return
  memoryCache.delete(thumbnailIdentity(url))
  const dir = await thumbnailCacheDir()
  if (!dir) return
  const key = await thumbnailCacheKey(url)
  for (const name of thumbnailFileNames(key)) {
    await FileSystem.deleteAsync(`${dir}${name}`, { idempotent: true }).catch(() => {})
  }
}
