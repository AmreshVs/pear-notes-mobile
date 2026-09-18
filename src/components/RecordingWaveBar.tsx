import { StyleSheet } from 'react-native'
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated'

import {
  RECORDING_BAR_MIN_RATIO,
  RECORDING_BAR_PEAK,
  RECORDING_BAR_REST_RATIO,
  RECORDING_BAR_W,
  RECORDING_BARS,
} from '@/components/useAudioRecorderModal'

interface RecordingWaveBarProps {
  index: number
  values: SharedValue<number[]>
  color: string
  active: boolean
  width?: number
  peak?: number
}

export function RecordingWaveBar({
  index,
  values,
  color,
  active,
  width = RECORDING_BAR_W,
  peak = RECORDING_BAR_PEAK,
}: RecordingWaveBarProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const amp = values.value[index] ?? 0.16
    const minHeight = peak * RECORDING_BAR_MIN_RATIO
    const restHeight = peak * RECORDING_BAR_REST_RATIO
    return {
      width,
      height: withTiming(active ? Math.max(minHeight, amp * peak) : restHeight, {
        duration: 120,
        easing: Easing.out(Easing.quad),
      }),
      backgroundColor: color,
      opacity: withTiming(active ? (index === RECORDING_BARS - 1 ? 1 : 0.92) : 0.22, {
        duration: 160,
        easing: Easing.out(Easing.quad),
      }),
    }
  }, [active, color, index, peak, values, width])

  return <Animated.View style={[styles.recordingBar, animatedStyle]} />
}

const styles = StyleSheet.create({
  recordingBar: {
    borderRadius: 999,
  },
})
