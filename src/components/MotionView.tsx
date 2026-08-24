import React from 'react'
import Animated from 'react-native-reanimated'

import { useReduceMotion } from '@/components/Themed'

type MotionViewProps = React.ComponentProps<typeof Animated.View>

export function MotionView({ entering, exiting, layout, ...props }: MotionViewProps) {
  const reduceMotion = useReduceMotion()

  if (reduceMotion) {
    return <Animated.View {...props} />
  }

  return <Animated.View entering={entering} exiting={exiting} layout={layout} {...props} />
}
