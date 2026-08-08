import { useEffect } from 'react'
import { AppState } from 'react-native'

import {
  IN_SESSION_CACHE_MAX_AGE_MS,
  pruneAttachmentCache,
  sweepTransientUploadCache,
} from '@/lib/cacheCleanup'

export function useAttachmentCachePrune() {
  useEffect(() => {
    pruneAttachmentCache().catch(() => {})
    sweepTransientUploadCache()

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'background') return
      pruneAttachmentCache(IN_SESSION_CACHE_MAX_AGE_MS).catch(() => {})
    })

    return () => subscription.remove()
  }, [])
}
