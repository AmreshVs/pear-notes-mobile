import * as FileSystem from 'expo-file-system/legacy'

import { cleanupCachedAttachment, downloadToCache } from '@/lib/noteAttachmentManager'
import {
  notifyThumbnailWritten,
  requestThumbnail,
  type ThumbnailFile,
  thumbnailPath,
} from '@/lib/thumbnailCache'

// Rows draw at 56pt, so this covers a 3x screen with headroom. A JPEG this size is tens of
// kilobytes against the megabytes of the original — the point of the exercise.
const IMAGE_THUMBNAIL_MAX_WIDTH = 256
const IMAGE_THUMBNAIL_QUALITY = 0.7
const BACKFILL_CONCURRENCY = 2

let backfillsRunning = 0
const backfillQueue: (() => void)[] = []

async function withBackfillSlot<T>(work: () => Promise<T>): Promise<T> {
  if (backfillsRunning >= BACKFILL_CONCURRENCY) {
    await new Promise<void>((resolve) => backfillQueue.push(resolve))
  } else {
    backfillsRunning++
  }
  try {
    return await work()
  } finally {
    const next = backfillQueue.pop()
    if (next) next()
    else backfillsRunning--
  }
}

let manipulatorModule: typeof import('expo-image-manipulator') | null | undefined

async function loadManipulator() {
  if (manipulatorModule === undefined) {
    try {
      manipulatorModule = await import('expo-image-manipulator')
    } catch {
      manipulatorModule = null
    }
  }
  return manipulatorModule
}

async function renderImageThumbnail(
  identity: string,
  localUri: string,
  dir: string,
  key: string,
): Promise<ThumbnailFile | null> {
  const manipulator = await loadManipulator()
  if (!manipulator) return null

  const context = manipulator.ImageManipulator.manipulate(localUri)
  const rendered = await context.resize({ width: IMAGE_THUMBNAIL_MAX_WIDTH }).renderAsync()
  const saved = await rendered.saveAsync({
    compress: IMAGE_THUMBNAIL_QUALITY,
    format: manipulator.SaveFormat.JPEG,
  })

  const fileUri = thumbnailPath(dir, key)
  await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {})
  try {
    await FileSystem.moveAsync({ from: saved.uri, to: fileUri })
  } catch {
    await FileSystem.copyAsync({ from: saved.uri, to: fileUri })
    await FileSystem.deleteAsync(saved.uri, { idempotent: true }).catch(() => {})
  }

  notifyThumbnailWritten(identity)
  return { fileUri, pageCount: 0 }
}

/** Cache-only lookup, for the notes list. Never fetches and never decodes the original. */
export async function getCachedImageThumbnail(url: string): Promise<ThumbnailFile | null> {
  if (!url) return null
  return requestThumbnail(url, false, async () => null).catch(() => null)
}

/**
 * Downscales an image that is already on disk (freshly attached or captured) into the thumbnail
 * cache. No-op when the entry already exists.
 */
export async function warmImageThumbnail(url: string, localUri: string): Promise<void> {
  if (!url || !localUri) return
  await requestThumbnail(url, true, ({ dir, key, identity }) =>
    renderImageThumbnail(identity, localUri, dir, key),
  ).catch(() => null)
}

/**
 * Backfills a thumbnail for an image attached before this cache existed, or on another device. The
 * row is about to load and decode the full image anyway, so this pulls the same bytes once and
 * leaves a small file behind — every later render reads tens of kilobytes instead of megabytes.
 */
export async function ensureImageThumbnail(
  url: string,
  fileName: string,
): Promise<ThumbnailFile | null> {
  if (!url) return null
  return requestThumbnail(url, true, ({ dir, key, identity }) =>
    withBackfillSlot(async () => {
      const localUri = await downloadToCache(url, fileName || `image-${key.slice(0, 8)}.jpg`)
      try {
        return await renderImageThumbnail(identity, localUri, dir, key)
      } finally {
        await cleanupCachedAttachment(localUri)
      }
    }),
  ).catch(() => null)
}
