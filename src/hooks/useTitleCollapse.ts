import { useCallback, useRef, useState } from 'react'
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native'

import {
  MIN_TITLE_COLLAPSE_DISTANCE,
  TITLE_COLLAPSE_BUFFER,
  TITLE_COLLAPSE_HYSTERESIS,
} from '@/constants/constants'

export function useTitleCollapse() {
  const titleBlockHeightRef = useRef(0)
  const scrollBaselineRef = useRef<number | null>(null)
  const isTitleCollapsedRef = useRef(false)
  const [isTitleCollapsed, setIsTitleCollapsed] = useState(false)

  const handleTitleBlockLayout = useCallback((event: LayoutChangeEvent) => {
    titleBlockHeightRef.current = event.nativeEvent.layout.height
  }, [])

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentInset } = event.nativeEvent
    const restingOffset = -(contentInset?.top ?? 0)
    if (
      !isTitleCollapsedRef.current &&
      (scrollBaselineRef.current === null ||
        Math.min(contentOffset.y, restingOffset) < scrollBaselineRef.current)
    ) {
      scrollBaselineRef.current = Math.min(contentOffset.y, restingOffset)
    }

    const scrolled = contentOffset.y - (scrollBaselineRef.current ?? 0)
    const threshold =
      Math.max(titleBlockHeightRef.current, MIN_TITLE_COLLAPSE_DISTANCE) + TITLE_COLLAPSE_BUFFER
    const collapsePoint = isTitleCollapsedRef.current
      ? threshold - TITLE_COLLAPSE_HYSTERESIS
      : threshold

    const next = titleBlockHeightRef.current > 0 && scrolled >= collapsePoint
    if (next === isTitleCollapsedRef.current) return
    isTitleCollapsedRef.current = next
    setIsTitleCollapsed(next)
  }, [])

  return { isTitleCollapsed, handleTitleBlockLayout, handleScroll }
}
