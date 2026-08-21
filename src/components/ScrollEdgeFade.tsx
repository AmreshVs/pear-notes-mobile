import { memo, useMemo } from 'react'
import { StyleSheet } from 'react-native'
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated'

import { Durations, UI_SIZE_32 } from '@/constants/commonStyles'
import { colorWithAlpha } from '@/utils/color'

type ScrollEdgeFadeProps = {
  color: string
  visible: boolean
  width?: number
}

export const ScrollEdgeFade = memo(function ScrollEdgeFade({
  color,
  visible,
  width = UI_SIZE_32,
}: ScrollEdgeFadeProps) {
  const gradientStyles = useMemo(
    () =>
      StyleSheet.create({
        gradient: {
          width,
          experimental_backgroundImage: `linear-gradient(to right, ${colorWithAlpha(color, 0)} 0%, ${colorWithAlpha(color, 0.75)} 60%, ${colorWithAlpha(color, 1)} 100%)`,
        },
      }),
    [color, width],
  )

  const animatedStyle = useAnimatedStyle(
    () => ({ opacity: withTiming(visible ? 1 : 0, { duration: Durations.fade }) }),
    [visible],
  )

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.fade, gradientStyles.gradient, animatedStyle]}
    />
  )
})

const styles = StyleSheet.create({
  fade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
  },
})
