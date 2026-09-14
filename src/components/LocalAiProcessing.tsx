import { useEffect } from 'react'
import { type DimensionValue, StyleSheet, View } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

import { Text, useReduceMotion } from '@/components/Themed'
import { FontFamily, FontSize, UI_SIZE_8, UI_SIZE_10, UI_SIZE_14 } from '@/constants/commonStyles'

const LINE_WIDTHS: DimensionValue[] = ['94%', '100%', '82%', '58%']
const CYCLE_MS = 1600
const LINE_STAGGER = 0.18
const RESTING_PROGRESS = 0.25

interface ShimmerLineProps {
  index: number
  width: DimensionValue
  color: string
  progress: SharedValue<number>
}

function ShimmerLine({ index, width, color, progress }: ShimmerLineProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const phase = (progress.value + index * LINE_STAGGER) % 1
    return { opacity: 0.16 + 0.44 * Math.sin(phase * Math.PI) }
  })
  return <Animated.View style={[styles.line, { width, backgroundColor: color }, animatedStyle]} />
}

interface LocalAiProcessingProps {
  color: string
  captionColor: string
  caption?: string | null
}

export function LocalAiProcessing({ color, captionColor, caption }: LocalAiProcessingProps) {
  const reduceMotion = useReduceMotion()
  const progress = useSharedValue(RESTING_PROGRESS)

  useEffect(() => {
    if (reduceMotion) {
      progress.value = RESTING_PROGRESS
      return
    }
    progress.value = 0
    progress.value = withRepeat(
      withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }),
      -1,
      false,
    )
    return () => cancelAnimation(progress)
  }, [progress, reduceMotion])

  return (
    <View style={styles.container} accessibilityRole="progressbar">
      <View style={styles.lines}>
        {LINE_WIDTHS.map((width, index) => (
          <ShimmerLine key={index} index={index} width={width} color={color} progress={progress} />
        ))}
      </View>
      {caption ? (
        <Text style={[styles.caption, { color: captionColor }]} accessibilityLiveRegion="polite">
          {caption}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: UI_SIZE_14,
    paddingVertical: UI_SIZE_8,
  },
  lines: {
    gap: UI_SIZE_10,
  },
  line: {
    height: UI_SIZE_10,
    borderRadius: UI_SIZE_10,
  },
  caption: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.medium,
  },
})
