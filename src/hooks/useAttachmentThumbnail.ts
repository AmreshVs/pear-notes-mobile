import { useMemo } from 'react'
import { useSelector } from 'react-redux'

import { ATTACHMENT_KIND } from '@pear-notes/core/store/services/noteAttachments.js'
import { getHyperdriveServerAddress } from '@pear-notes/core/store/slices/uiSlice.js'

import type { AttachmentItem } from '@/components/attachments/attachments.types'
import { useCachedImageThumbnail } from '@/lib/useCachedImageThumbnail'
import { useCachedPdfThumbnail } from '@/lib/useCachedPdfThumbnail'
import { resolveHyperdriveUrl } from '@/utils/hyperdriveUrl'

function useAttachmentServerUrl(item: AttachmentItem | null): string | null {
  const serverAddress = useSelector(getHyperdriveServerAddress)
  return useMemo(
    () => (item ? resolveHyperdriveUrl(item.url, serverAddress) || null : null),
    [item, serverAddress],
  )
}

export function useAttachmentThumbnail(item: AttachmentItem | null) {
  const serverUrl = useAttachmentServerUrl(item)
  const isPhoto = item?.kind === ATTACHMENT_KIND.PHOTO
  const isPdf = item?.kind === ATTACHMENT_KIND.PDF
  const pdfRef = useMemo(
    () => (isPdf && item ? { url: item.url, fileName: item.fileName } : null),
    [isPdf, item],
  )
  const imageThumbnail = useCachedImageThumbnail(serverUrl, isPhoto)
  const pdfThumbnail = useCachedPdfThumbnail(pdfRef, isPdf)
  if (isPhoto) return imageThumbnail || serverUrl
  return pdfThumbnail
}
