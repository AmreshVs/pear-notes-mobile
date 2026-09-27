import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Platform } from 'react-native'
import { useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useEvent, useEventListener } from 'expo'
import { useVideoPlayer } from 'expo-video'

import { Durations, UI_SIZE_12 } from '@/constants/commonStyles'

const CONTROLS_HIDE_DELAY =
  Platform.OS === 'android' ? Durations.videoControlsHideAndroid : Durations.videoControlsHideIos

export function useVideoPlayerModal(uri: string, title: string, onError: () => void) {
  const insets = useSafeAreaInsets()
  const hasPlayed = useRef(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [controlsVisible, setControlsVisible] = useState(true)
  const player = useVideoPlayer({ uri, metadata: { title } }, (p) => p.play())
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing })

  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay') hasPlayed.current = true
    else if (status === 'error' && !hasPlayed.current) onError()
  })

  const cancelHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = null
  }, [])

  const scheduleHide = useCallback(() => {
    cancelHide()
    if (!isPlaying) return
    hideTimer.current = setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_DELAY)
  }, [cancelHide, isPlaying])

  useEffect(() => {
    setControlsVisible(true)
    scheduleHide()
    return cancelHide
  }, [scheduleHide, cancelHide])

  const handleTouchStart = useCallback(() => {
    cancelHide()
    setControlsVisible(true)
  }, [cancelHide])

  const headerInset = useMemo(() => ({ top: insets.top + UI_SIZE_12 }), [insets.top])

  const closeButtonAnimatedStyle = useAnimatedStyle(
    () => ({ opacity: withTiming(controlsVisible ? 1 : 0, { duration: Durations.fade }) }),
    [controlsVisible],
  )

  return {
    player,
    headerInset,
    controlsVisible,
    closeButtonAnimatedStyle,
    handleTouchStart,
    handleTouchEnd: scheduleHide,
  }
}
