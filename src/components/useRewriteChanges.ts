import { useCallback, useMemo, useState } from 'react'

import { groupRewriteParagraphs } from '@pear-notes/core/store/services/localAiRewriteDiff.js'

import type { RewriteDiff, RewriteItem, RewriteView } from '@/lib/localAi/rewriteChanges'

export function useRewriteChanges(diff: RewriteDiff) {
  const [view, setView] = useState<RewriteView>(diff.mostlyChanged ? 'result' : 'changes')
  const [showUnchanged, setShowUnchanged] = useState(false)

  const items = useMemo<RewriteItem[]>(
    () =>
      showUnchanged
        ? diff.paragraphs.map((paragraph) => ({ type: 'paragraph' as const, paragraph }))
        : (groupRewriteParagraphs(diff.paragraphs) as RewriteItem[]),
    [diff.paragraphs, showUnchanged],
  )

  const handleShowUnchanged = useCallback(() => setShowUnchanged(true), [])

  return {
    view,
    setView,
    items,
    handleShowUnchanged,
    showBanner: diff.mostlyChanged && view === 'result',
  }
}
