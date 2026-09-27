import { useCallback, useState } from 'react'

import { isVideoFile, withVideoMediaType } from '@/utils/media'

type VideoAttachment = {
  uri: string
  url: string
  fileName: string
  attachmentId?: string
}

type Fallback = (url: string, fileName: string, attachmentId?: string) => void

export function useVideoAttachmentPlayer(resolveUrl: (url: string) => string, fallback: Fallback) {
  const [video, setVideo] = useState<VideoAttachment | null>(null)

  const openVideo = useCallback(
    (url: string, fileName: string, attachmentId?: string) => {
      if (!url || !isVideoFile(fileName)) return false
      setVideo({ uri: withVideoMediaType(resolveUrl(url), fileName), url, fileName, attachmentId })
      return true
    },
    [resolveUrl],
  )

  const closeVideo = useCallback(() => setVideo(null), [])

  const handleVideoError = useCallback(() => {
    setVideo(null)
    if (video) fallback(video.url, video.fileName, video.attachmentId)
  }, [fallback, video])

  return { video, openVideo, closeVideo, handleVideoError }
}
