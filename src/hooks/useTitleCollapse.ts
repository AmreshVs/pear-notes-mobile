import { useCallback, useMemo, useRef, useState } from 'react'
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native'

import {
  MIN_TITLE_COLLAPSE_DISTANCE,
  SCROLL_EVENT_THROTTLE,
  TITLE_COLLAPSE_BUFFER,
  TITLE_COLLAPSE_HYSTERESIS,
} from '@/constants/constants'

export function useTitleCollapse() {
  const titleBlockBottomRef = useRef(0)
  const restingOffsetRef = useRef(0)
  const hasInteractedRef = useRef(false)
  const isTitleCollapsedRef = useRef(false)
  const [isTitleCollapsed, setIsTitleCollapsed] = useState(false)

  const handleTitleBlockLayout = useCallback((event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout
    titleBlockBottomRef.current = y + height
  }, [])

  const lowerRestingOffset = useCallback((offsetY: number) => {
    if (offsetY < restingOffsetRef.current) restingOffsetRef.current = offsetY
  }, [])

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y
      if (!hasInteractedRef.current) lowerRestingOffset(offsetY)

      const scrolledPastResting = offsetY - restingOffsetRef.current
      const threshold =
        Math.max(titleBlockBottomRef.current, MIN_TITLE_COLLAPSE_DISTANCE) + TITLE_COLLAPSE_BUFFER
      const collapsePoint = isTitleCollapsedRef.current
        ? threshold - TITLE_COLLAPSE_HYSTERESIS
        : threshold

      const next = titleBlockBottomRef.current > 0 && scrolledPastResting >= collapsePoint
      if (next === isTitleCollapsedRef.current) return
      isTitleCollapsedRef.current = next
      setIsTitleCollapsed(next)
    },
    [lowerRestingOffset],
  )

  const handleScrollBeginDrag = useCallback(() => {
    hasInteractedRef.current = true
  }, [])

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      lowerRestingOffset(event.nativeEvent.contentOffset.y)
    },
    [lowerRestingOffset],
  )

  const scrollProps = useMemo(
    () => ({
      onScroll: handleScroll,
      onScrollBeginDrag: handleScrollBeginDrag,
      onMomentumScrollEnd: handleMomentumScrollEnd,
      scrollEventThrottle: SCROLL_EVENT_THROTTLE,
    }),
    [handleScroll, handleScrollBeginDrag, handleMomentumScrollEnd],
  )

  return { isTitleCollapsed, handleTitleBlockLayout, scrollProps }
}
