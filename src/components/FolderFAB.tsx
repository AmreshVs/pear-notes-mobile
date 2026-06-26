import { FolderPlus } from 'lucide-react-native'
import { Pressable, StyleSheet } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'

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
            scale.value = withSpring(0.88, { damping: 15, stiffness: 300 })
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 12, stiffness: 250 })
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
