import { useCallback, useMemo } from 'react'
import { usePathname } from 'expo-router'

import { useShareSummary } from '@/components/share/useShareSummary'
import { hapticLight } from '@/lib/haptics'
import {
  countSharedItemCategories,
  getSharedItemCategory,
  MAX_SHARED_PREVIEWS,
} from '@/lib/sharedContent'
import type { SharedItem, SharedItemCategory } from '@/lib/shareIntake.types'
import { discardAllSharedItems, useShareIntakeSnapshot } from '@/lib/shareIntakeState'

const HIDDEN_ROUTE_PREFIX = '/settings'

export type SharedItemPreview = {
  key: string
  category: SharedItemCategory
  imageUri?: string
}

type UseSharedItemsTrayOptions = {
  isNoteOpen: boolean
  canAddToNote: boolean
}

function toSharedItemPreview(item: SharedItem): SharedItemPreview {
  const category = getSharedItemCategory(item)
  const imageUri = category === 'photo' && item.kind === 'file' ? item.uri : undefined
  return { key: item.id, category, imageUri }
}

export function useSharedItemsTray({ isNoteOpen, canAddToNote }: UseSharedItemsTrayOptions) {
  const pathname = usePathname()
  const { items, preparing } = useShareIntakeSnapshot()

  const shareSummary = useShareSummary(items)
  const itemCount = items.length
  const hasItems = itemCount > 0
  const isHiddenRoute = pathname.startsWith(HIDDEN_ROUTE_PREFIX)
  const showAddAction = isNoteOpen && canAddToNote && hasItems
  const isVisible = !isHiddenRoute && (isNoteOpen ? showAddAction : hasItems || preparing)
  const isPreparingOnly = preparing && !hasItems

  const categoryCounts = useMemo(() => countSharedItemCategories(items), [items])
  const previews = useMemo(
    () => items.slice(0, MAX_SHARED_PREVIEWS).map(toSharedItemPreview),
    [items],
  )

  const handleDiscard = useCallback(() => {
    hapticLight()
    discardAllSharedItems()
  }, [])

  return {
    isVisible,
    showAddAction,
    isPreparingOnly,
    itemCount,
    categoryCounts,
    previews,
    shareSummary,
    handleDiscard,
  }
}
