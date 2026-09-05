import { useEffect, useState } from 'react'

import { ensureImageThumbnail, getCachedImageThumbnail } from '@/lib/imageThumbnails'
import { subscribeThumbnailWrites, thumbnailIdentity } from '@/lib/thumbnailCache'

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

    const read = () =>
      getCachedImageThumbnail(url).then((thumbnail) => {
        if (active && thumbnail) setResolved({ url, fileUri: thumbnail.fileUri })
        return thumbnail
      })

    read().then((thumbnail) => {
      // Nothing cached yet: build one from the bytes this row is about to load anyway.
      if (!thumbnail && active) ensureImageThumbnail(url, '')
    })

    const target = thumbnailIdentity(url)
    const unsubscribe = subscribeThumbnailWrites((written) => {
      if (written === target) read()
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [enabled, url])

  if (!enabled || !url || resolved?.url !== url) return null
  return resolved.fileUri
}
