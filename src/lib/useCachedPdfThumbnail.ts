import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

import { getHyperdriveServerAddress } from '@pear-notes/core/store/slices/uiSlice.js'

import { getCachedPdfThumbnail } from '@/lib/pdfTools'
import { subscribeThumbnailWrites, thumbnailIdentity } from '@/lib/thumbnailCache'
import { resolveHyperdriveUrl } from '@/utils/hyperdriveUrl'
import type { PdfAttachmentRef } from '@/utils/noteUtils'

type ResolvedThumbnail = {
  url: string
  fileUri: string
}

/**
 * Page-1 thumbnail for a note's PDF attachment, read from the on-disk cache only. A note row must
 * never pull the PDF through the blob server just to draw itself, so a note whose thumbnail has not
 * been rendered yet (attached elsewhere and never opened here) simply gets `null`. Attaching a PDF
 * or opening the note renders and caches one.
 */
export function useCachedPdfThumbnail(pdf: PdfAttachmentRef | null, enabled: boolean) {
  const hyperdriveServerAddress = useSelector(getHyperdriveServerAddress)
  // Keyed by url so a recycled row never flashes the previous note's thumbnail.
  const [resolved, setResolved] = useState<ResolvedThumbnail | null>(null)

  const url = pdf?.url ?? ''

  useEffect(() => {
    if (!enabled || !url) return

    let active = true
    const serverUrl = resolveHyperdriveUrl(url, hyperdriveServerAddress) || url

    const read = () => {
      getCachedPdfThumbnail(serverUrl).then((thumbnail) => {
        if (active && thumbnail) setResolved({ url, fileUri: thumbnail.fileUri })
      })
    }

    read()
    // Opening the note renders and caches the thumbnail; pick it up without an app restart.
    const target = thumbnailIdentity(serverUrl)
    const unsubscribe = subscribeThumbnailWrites((written) => {
      if (written === target) read()
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [enabled, url, hyperdriveServerAddress])

  if (!enabled || !url || resolved?.url !== url) return null
  return resolved.fileUri
}
