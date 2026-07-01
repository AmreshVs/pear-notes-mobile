import { FolderPlus } from 'lucide-react-native'
import { Pressable, StyleSheet } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import { GlassView } from '@/components/GlassView'
import { useColors } from '@/components/Themed'
import {
  commonStyles,
  Space,
  UI_ICON_SIZE_26,
  UI_SIZE_30,
  UI_SIZE_36,
  UI_SIZE_60,
} from '@/constants/commonStyles'

interface FolderFABProps {
  onPress: () => void
}

export function FolderFAB({ onPress = () => {} }: FolderFABProps) {
  const colors = useColors()

  const scale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Animated.View style={[styles.fab, animatedStyle]}>
      <GlassView intensity={20} borderRadius={UI_SIZE_30} style={styles.glass}>
        <Pressable
          onPress={onPress}
          onPressIn={() => {
            scale.value = withTiming(0.88, { duration: 120, easing: Easing.out(Easing.cubic) })
          }}
          onPressOut={() => {
            scale.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) })
          }}
          style={styles.btn}
        >
          <FolderPlus size={UI_ICON_SIZE_26} color={colors.text} strokeWidth={1.7} />
        </Pressable>
      </GlassView>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: UI_SIZE_36,
    right: Space.base,
  },
  glass: {
    borderRadius: UI_SIZE_30,
  },
  btn: {
    ...commonStyles.centered,
    width: UI_SIZE_60,
    height: UI_SIZE_60,
    borderRadius: UI_SIZE_30,
  },
})
