import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Keyboard, type LayoutChangeEvent, type ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useHeaderHeight } from 'expo-router/react-navigation'

export function useAskThreadScroll(isEmpty: boolean) {
  const threadRef = useRef<ScrollView>(null)
  const headerHeight = useHeaderHeight()
  const insets = useSafeAreaInsets()
  const viewportHeightRef = useRef(0)
  const contentHeightRef = useRef(0)
  const followLatestRef = useRef(false)

  const contentInset = useMemo(
    () => ({ top: headerHeight, bottom: insets.bottom }),
    [headerHeight, insets.bottom],
  )
  const contentOffset = useMemo(() => ({ x: 0, y: -headerHeight }), [headerHeight])

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    viewportHeightRef.current = event.nativeEvent.layout.height
  }, [])

  const scrollToLatest = useCallback(() => {
    const keyboardHeight = Keyboard.isVisible() ? (Keyboard.metrics()?.height ?? 0) : 0
    const bottomInset = Math.max(keyboardHeight, insets.bottom)
    const y = Math.max(
      contentHeightRef.current - viewportHeightRef.current + bottomInset,
      -headerHeight,
    )
    threadRef.current?.scrollTo({ y, animated: true })
  }, [headerHeight, insets.bottom])

  const onContentSizeChange = useCallback(
    (_width: number, contentHeight: number) => {
      contentHeightRef.current = contentHeight
      if (isEmpty) return
      followLatestRef.current = true
      scrollToLatest()
    },
    [isEmpty, scrollToLatest],
  )

  const onScrollBeginDrag = useCallback(() => {
    followLatestRef.current = false
  }, [])

  useEffect(() => {
    if (isEmpty) return
    const subscription = Keyboard.addListener('keyboardDidHide', () => {
      if (followLatestRef.current) scrollToLatest()
    })
    return () => subscription.remove()
  }, [isEmpty, scrollToLatest])

  const scrollProps = useMemo(
    () => ({
      contentInsetAdjustmentBehavior: 'never' as const,
      contentInset,
      contentOffset,
      automaticallyAdjustKeyboardInsets: true,
      onLayout,
      onContentSizeChange,
      onScrollBeginDrag,
    }),
    [contentInset, contentOffset, onContentSizeChange, onLayout, onScrollBeginDrag],
  )

  return { threadRef, scrollProps }
}
