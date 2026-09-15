import { memo, type ReactNode } from 'react'
import { StyleSheet, View, type ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated'
import MaskedView from '@react-native-masked-view/masked-view'

import { Durations, UI_SIZE_32 } from '@/constants/commonStyles'

type ScrollEdgeMaskProps = {
  visible: boolean
  width?: number
  style?: ViewStyle
  children: ReactNode
}

export const ScrollEdgeMask = memo(function ScrollEdgeMask({
  visible,
  width = UI_SIZE_32,
  style,
  children,
}: ScrollEdgeMaskProps) {
  const coverStyle = useAnimatedStyle(
    () => ({ opacity: withTiming(visible ? 0 : 1, { duration: Durations.fade }) }),
    [visible],
  )

  const maskElement = (
    <View style={styles.maskRow}>
      <View style={styles.solid} />
      <View style={[styles.fade, { width }]}>
        <Animated.View style={[styles.cover, coverStyle]} />
      </View>
    </View>
  )

  return (
    <MaskedView style={style} maskElement={maskElement}>
      {children}
    </MaskedView>
  )
})

const styles = StyleSheet.create({
  maskRow: {
    flex: 1,
    flexDirection: 'row',
  },
  solid: {
    flex: 1,
    backgroundColor: 'black',
  },
  fade: {
    experimental_backgroundImage: 'linear-gradient(to right, black 0%, transparent 100%)',
  },
  cover: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'black',
  },
})
