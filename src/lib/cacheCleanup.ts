import * as FileSystem from 'expo-file-system/legacy'
import { Image } from 'expo-image'

import { getNoteSummary } from '@pear-notes/core/utils.js'

import { ATTACHMENT_THUMBNAIL_CACHE_DIR } from '@/constants/constants'
import { ATTACHMENT_CACHE_PREFIX } from '@/lib/noteAttachmentManager'
import { thumbnailCacheKey, thumbnailFileNames } from '@/lib/thumbnailCache'

export const IN_SESSION_CACHE_MAX_AGE_MS = 30 * 60 * 1000

// A thumbnail written moments ago may belong to an attachment whose note has not reached the store
// yet, so young files are never swept.
const THUMBNAIL_SWEEP_GRACE_MS = 5 * 60 * 1000

const TRANSIENT_CACHE_DIRS = ['ImagePicker', 'Audio', 'AV', 'mlkit_docscan_ui_client']
const UPLOAD_CACHE_PREFIX = 'upload-'
const SCAN_PDF_PREFIX = 'scan-'
const TRANSIENT_AUDIO_PREFIXES = ['transcript-', 'dictation-']

export async function sweepTransientUploadCache(): Promise<void> {
  const directory = FileSystem.cacheDirectory
  if (!directory) return
  try {
    const names = await FileSystem.readDirectoryAsync(directory)
    await Promise.all(
      names
        .filter(
          (name) =>
            name.startsWith(UPLOAD_CACHE_PREFIX) ||
            name.startsWith(SCAN_PDF_PREFIX) ||
            TRANSIENT_AUDIO_PREFIXES.some((prefix) => name.startsWith(prefix)) ||
            TRANSIENT_CACHE_DIRS.includes(name),
        )
        .map((name) => FileSystem.deleteAsync(`${directory}${name}`, { idempotent: true })),
    )
  } catch {}
}

export async function pruneAttachmentCache(maxAgeMs = 0): Promise<number> {
  const directory = FileSystem.cacheDirectory
  if (!directory) return 0

  let names: string[] = []
  try {
    names = await FileSystem.readDirectoryAsync(directory)
  } catch {
    return 0
  }

  const cutoff = Date.now() - maxAgeMs
  let reclaimed = 0

  for (const name of names) {
    if (!name.startsWith(ATTACHMENT_CACHE_PREFIX)) continue
    const uri = `${directory}${name}`
    try {
      const info = await FileSystem.getInfoAsync(uri)
      if (!info.exists) continue
      if (maxAgeMs > 0) {
        const modified = (info.modificationTime ?? 0) * 1000
        if (modified > cutoff) continue
      }
      reclaimed += info.size ?? 0
      await FileSystem.deleteAsync(uri, { idempotent: true })
    } catch {
      continue
    }
  }

  return reclaimed
}

type SweepNote = { value?: object | null } | null

/**
 * Drops every PDF thumbnail no note refers to any more.
 *
 * The notes list draws these, so they cannot expire on a timer — a thumbnail lives exactly as long
 * as its attachment does. That also means the sweep is the only thing reclaiming space when a PDF
 * disappears because a *linked device* removed it; deletions made here reclaim immediately via
 * deletePdfThumbnail. `notes` must be every note held on this device, trashed ones included: a note
 * in Recently Deleted can be restored, so its thumbnail has to survive until it is purged.
 */
export async function sweepThumbnailCache(notes: SweepNote[]): Promise<void> {
  const directory = FileSystem.cacheDirectory
  if (!directory) return
  const dir = `${directory}${ATTACHMENT_THUMBNAIL_CACHE_DIR}/`

  let names: string[] = []
  try {
    names = await FileSystem.readDirectoryAsync(dir)
  } catch {
    return
  }
  if (names.length === 0) return

  const urls = new Set<string>()
  for (const note of notes) {
    if (!note?.value) continue
    const summary = getNoteSummary(note.value) as {
      pdfs?: { url: string }[]
      images?: string[]
    }
    for (const pdf of summary.pdfs || []) urls.add(pdf.url)
    for (const image of summary.images || []) urls.add(image)
  }

  const liveFiles = new Set<string>()
  for (const url of urls) {
    try {
      const key = await thumbnailCacheKey(url)
      for (const name of thumbnailFileNames(key)) liveFiles.add(name)
    } catch {
      // A url we cannot hash is a url we cannot match, so keep everything rather than risk
      // deleting a live thumbnail.
      return
    }
  }

  const cutoff = Date.now() - THUMBNAIL_SWEEP_GRACE_MS
  for (const name of names) {
    if (liveFiles.has(name)) continue
    const uri = `${dir}${name}`
    try {
      const info = await FileSystem.getInfoAsync(uri)
      if (!info.exists) continue
      if ((info.modificationTime ?? 0) * 1000 > cutoff) continue
      await FileSystem.deleteAsync(uri, { idempotent: true })
    } catch {
      continue
    }
  }
}

/**
 * Clears the throwaway caches. Attachment thumbnails are kept on purpose: they are what the notes
 * list draws, and dropping them would blank every row until each note was opened again.
 */
export async function clearCaches(): Promise<void> {
  const directory = FileSystem.cacheDirectory
  if (!directory) return

  sweepTransientUploadCache()
  await pruneAttachmentCache().catch(() => {})

  let names: string[] = []
  try {
    names = await FileSystem.readDirectoryAsync(directory)
  } catch {
    return
  }

  for (const name of names) {
    if (name === ATTACHMENT_THUMBNAIL_CACHE_DIR) continue
    await FileSystem.deleteAsync(`${directory}${name}`, { idempotent: true }).catch(() => {})
  }

  // expo-image keeps its own store outside the paths above, and on iOS SDWebImage applies no size
  // limit to it by default.
  await Image.clearDiskCache().catch(() => {})
  await Image.clearMemoryCache().catch(() => {})
}
