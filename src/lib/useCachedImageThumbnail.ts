import { useEffect, useState } from 'react'
import { AppState } from 'react-native'

import { ensureImageThumbnail, getCachedImageThumbnail } from '@/lib/imageThumbnails'
import { waitForBlobServer } from '@/lib/noteUploadManager'
import { subscribeThumbnailWrites, thumbnailIdentity } from '@/lib/thumbnailCache'

const BACKFILL_RETRY_DELAYS_MS = [2000, 5000]

type ResolvedThumbnail = {
  url: string
  fileUri: string
}

/**
 * Small downscaled stand-in for a note's image attachment.
 *
 * Rows used to point expo-image straight at the full attachment and cache it on disk, which stored
 * a second copy of every photo at original size (SDWebImage's disk cache has no size limit). Now
 * the row draws a ~256px JPEG we generate once, and the caller keeps the full image out of the disk
 * cache. Returns null until one exists, in which case the caller falls back to the original.
 *
 * `serverUrl` must already be resolved against the blob server.
 */
export function useCachedImageThumbnail(serverUrl: string | null | undefined, enabled: boolean) {
  const [resolved, setResolved] = useState<ResolvedThumbnail | null>(null)
  const url = serverUrl || ''

  useEffect(() => {
    if (!enabled || !url) return

    let active = true
    let found = false
    let attempt = 0
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    const read = () =>
      getCachedImageThumbnail(url).then((thumbnail) => {
        if (thumbnail) found = true
        if (active && thumbnail) setResolved({ url, fileUri: thumbnail.fileUri })
        return thumbnail
      })

    const backfill = async () => {
      if (!active || AppState.currentState !== 'active') return
      const thumbnail = await ensureImageThumbnail(url, '')
      if (!active || thumbnail) return
      const delay = BACKFILL_RETRY_DELAYS_MS[attempt++]
      if (delay !== undefined) retryTimer = setTimeout(backfill, delay)
    }

    const readOrBackfill = () =>
      read().then((thumbnail) => {
        if (!thumbnail && active) backfill()
      })

    readOrBackfill()

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !active || found) return
      clearTimeout(retryTimer)
      attempt = 0
      waitForBlobServer().then(() => {
        if (active) readOrBackfill()
      })
    })

    const target = thumbnailIdentity(url)
    const unsubscribe = subscribeThumbnailWrites((written) => {
      if (written === target) read()
    })

    return () => {
      active = false
      clearTimeout(retryTimer)
      appStateSub.remove()
      unsubscribe()
    }
  }, [enabled, url])

  if (!enabled || !url || resolved?.url !== url) return null
  return resolved.fileUri
}
