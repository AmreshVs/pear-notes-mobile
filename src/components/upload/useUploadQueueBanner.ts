import { useCallback, useEffect, useState } from 'react'

import {
  cancelNoteUploadItem,
  cancelNoteUploadQueue,
  useNoteUploadQueue,
} from '@/lib/uploadRegistry'

export function useUploadQueueBanner(noteId: string | null) {
  const queue = useNoteUploadQueue(noteId)
  const [expanded, setExpanded] = useState(false)

  const hasQueue = queue.items.length > 0
  const isBatch = queue.totalCount > 1

  useEffect(() => {
    if (!hasQueue) setExpanded(false)
  }, [hasQueue])

  const toggleExpanded = useCallback(() => setExpanded((value) => !value), [])

  const cancelItem = useCallback(
    (itemId: string) => {
      if (noteId) cancelNoteUploadItem(noteId, itemId)
    },
    [noteId],
  )

  const cancelAll = useCallback(() => {
    if (noteId) cancelNoteUploadQueue(noteId)
  }, [noteId])

  const currentIndex = Math.min(queue.completedCount + 1, queue.totalCount)

  return {
    queue,
    hasQueue,
    isBatch,
    expanded: expanded && isBatch,
    canExpand: isBatch,
    currentIndex,
    toggleExpanded,
    cancelItem,
    cancelAll,
  }
}
