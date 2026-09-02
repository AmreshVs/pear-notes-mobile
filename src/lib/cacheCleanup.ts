import * as FileSystem from 'expo-file-system/legacy'

import { PDF_THUMBNAIL_CACHE_DIR, PDF_THUMBNAIL_MAX_AGE_MS } from '@/constants/constants'
import { ATTACHMENT_CACHE_PREFIX } from '@/lib/noteAttachmentManager'

export const IN_SESSION_CACHE_MAX_AGE_MS = 30 * 60 * 1000

const TRANSIENT_CACHE_DIRS = ['ImagePicker', 'Audio', 'AV', 'mlkit_docscan_ui_client']
const UPLOAD_CACHE_PREFIX = 'upload-'
const SCAN_PDF_PREFIX = 'scan-'

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

export async function prunePdfThumbnailCache(maxAgeMs = PDF_THUMBNAIL_MAX_AGE_MS): Promise<void> {
  const directory = FileSystem.cacheDirectory
  if (!directory) return
  const dir = `${directory}${PDF_THUMBNAIL_CACHE_DIR}/`

  let names: string[] = []
  try {
    names = await FileSystem.readDirectoryAsync(dir)
  } catch {
    return
  }

  const cutoff = Date.now() - maxAgeMs
  for (const name of names) {
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
