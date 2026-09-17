import { StyleSheet, View } from 'react-native'
import type { SharedValue } from 'react-native-reanimated'

import { RecordingWaveBar } from '@/components/RecordingWaveBar'
import { RECORDING_BAR_GAP, RECORDING_BARS } from '@/components/useAudioRecorderModal'
import { UI_SIZE_32 } from '@/constants/commonStyles'

const VISIBLE_BARS = 24
const BAR_INDEXES = Array.from(
  { length: VISIBLE_BARS },
  (_, offset) => RECORDING_BARS - VISIBLE_BARS + offset,
)

interface VoiceTypingWaveProps {
  values: SharedValue<number[]>
  color: string
  active: boolean
}

export function VoiceTypingWave({ values, color, active }: VoiceTypingWaveProps) {
  const renderBar = (index: number) => (
    <RecordingWaveBar key={index} active={active} index={index} values={values} color={color} />
  )

  return <View style={styles.row}>{BAR_INDEXES.map(renderBar)}</View>
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: RECORDING_BAR_GAP,
    height: UI_SIZE_32,
    overflow: 'hidden',
  },
})
