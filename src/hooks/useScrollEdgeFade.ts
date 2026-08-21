import { useCallback, useRef, useState } from 'react'
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native'

const REMAINING_SCROLL_THRESHOLD = 8

export const useScrollEdgeFade = () => {
  const viewportWidth = useRef(0)
  const contentWidth = useRef(0)
  const scrollOffset = useRef(0)
  const [showEndFade, setShowEndFade] = useState(false)

  const syncEndFade = useCallback(() => {
    const remaining = contentWidth.current - viewportWidth.current - scrollOffset.current
    setShowEndFade(remaining > REMAINING_SCROLL_THRESHOLD)
  }, [])

  const handleScrollLayout = useCallback(
    (event: LayoutChangeEvent) => {
      viewportWidth.current = event.nativeEvent.layout.width
      syncEndFade()
    },
    [syncEndFade],
  )

  const handleContentSizeChange = useCallback(
    (width: number) => {
      contentWidth.current = width
      syncEndFade()
    },
    [syncEndFade],
  )

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffset.current = event.nativeEvent.contentOffset.x
      syncEndFade()
    },
    [syncEndFade],
  )

  return { showEndFade, handleScrollLayout, handleContentSizeChange, handleScroll }
}
