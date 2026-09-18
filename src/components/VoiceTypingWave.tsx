import { useCallback, useMemo, useState } from 'react'
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native'
import type { SharedValue } from 'react-native-reanimated'

import { RecordingWaveBar } from '@/components/RecordingWaveBar'
import {
  RECORDING_BAR_GAP,
  RECORDING_BAR_PEAK,
  RECORDING_BAR_W,
  RECORDING_BARS,
} from '@/components/useAudioRecorderModal'
import { UI_SIZE_32 } from '@/constants/commonStyles'

const MIN_VISIBLE_BARS = 12
const BAR_WIDTH_EPSILON = 0.5

type WaveLayout = { indexes: number[]; barWidth: number }

const EMPTY_WAVE_LAYOUT: WaveLayout = { indexes: [], barWidth: RECORDING_BAR_W }

function isSameWaveLayout(current: WaveLayout, next: WaveLayout) {
  return (
    current.indexes.length === next.indexes.length &&
    Math.abs(current.barWidth - next.barWidth) < BAR_WIDTH_EPSILON
  )
}

function getWaveLayout(width: number): WaveLayout {
  if (width <= 0) return EMPTY_WAVE_LAYOUT
  const slotWidth = RECORDING_BAR_W + RECORDING_BAR_GAP
  const fittingBars = Math.floor((width + RECORDING_BAR_GAP) / slotWidth)
  const visibleBars = Math.min(RECORDING_BARS, Math.max(MIN_VISIBLE_BARS, fittingBars))
  const gapsWidth = (visibleBars - 1) * RECORDING_BAR_GAP
  return {
    indexes: Array.from(
      { length: visibleBars },
      (_, offset) => RECORDING_BARS - visibleBars + offset,
    ),
    barWidth: Math.max(RECORDING_BAR_W, (width - gapsWidth) / visibleBars),
  }
}

interface VoiceTypingWaveProps {
  values: SharedValue<number[]>
  color: string
  active: boolean
  height?: number
  peak?: number
}

export function VoiceTypingWave({
  values,
  color,
  active,
  height = UI_SIZE_32,
  peak = RECORDING_BAR_PEAK,
}: VoiceTypingWaveProps) {
  const [{ indexes, barWidth }, setWaveLayout] = useState(EMPTY_WAVE_LAYOUT)
  const rowStyle = useMemo(() => [styles.row, { height }], [height])

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const next = getWaveLayout(event.nativeEvent.layout.width)
    setWaveLayout((current) => (isSameWaveLayout(current, next) ? current : next))
  }, [])

  const renderBar = (index: number) => (
    <RecordingWaveBar
      key={index}
      active={active}
      index={index}
      values={values}
      color={color}
      width={barWidth}
      peak={peak}
    />
  )

  return (
    <View style={rowStyle} onLayout={handleLayout}>
      {indexes.map(renderBar)}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: RECORDING_BAR_GAP,
    overflow: 'hidden',
  },
})
