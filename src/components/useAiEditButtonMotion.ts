import { useEffect } from 'react'
import { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { useReduceMotion } from '@/components/Themed'

const LABEL_MAX_WIDTH = 96
const LABEL_GAP = 6
const TRANSITION_MS = 220

export function useAiEditButtonMotion(active: boolean) {
  const reduceMotion = useReduceMotion()
  const progress = useSharedValue(active ? 1 : 0)

  useEffect(() => {
    const target = active ? 1 : 0
    progress.value = reduceMotion
      ? target
      : withTiming(target, { duration: TRANSITION_MS, easing: Easing.out(Easing.cubic) })
  }, [active, progress, reduceMotion])

  const labelStyle = useAnimatedStyle(() => ({
    maxWidth: progress.value * LABEL_MAX_WIDTH,
    marginLeft: progress.value * LABEL_GAP,
    opacity: progress.value,
  }))

  const highlightStyle = useAnimatedStyle(() => ({ opacity: progress.value }))

  return { labelStyle, highlightStyle }
}
