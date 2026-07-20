import { StyleSheet } from 'react-native'
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated'

import { RECORDING_BAR_W, RECORDING_BARS } from '@/components/useAudioRecorderModal'

interface RecordingWaveBarProps {
  index: number
  values: SharedValue<number[]>
  color: string
  active: boolean
}

export function RecordingWaveBar({ index, values, color, active }: RecordingWaveBarProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const amp = values.value[index] ?? 0.16
    return {
      height: withTiming(active ? Math.max(16, amp * 84) : 20, {
        duration: 120,
        easing: Easing.out(Easing.quad),
      }),
      backgroundColor: color,
      opacity: withTiming(active ? (index === RECORDING_BARS - 1 ? 1 : 0.92) : 0.22, {
        duration: 160,
        easing: Easing.out(Easing.quad),
      }),
    }
  }, [active, color, index, values])

  return <Animated.View style={[styles.recordingBar, animatedStyle]} />
}

const styles = StyleSheet.create({
  recordingBar: {
    width: RECORDING_BAR_W,
    borderRadius: 999,
  },
})
