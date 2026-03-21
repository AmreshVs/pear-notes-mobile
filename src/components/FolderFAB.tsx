import { FolderPlus } from 'lucide-react-native'
import React from 'react'
import { Pressable, StyleSheet } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'

import { GlassView } from '@/components/GlassView'
import { useColors } from '@/components/Themed'
import { Space, useCommonStyles } from '@/constants/commonStyles'

interface FolderFABProps {
  onPress: () => void
}

export function FolderFAB({ onPress }: FolderFABProps) {
  const colors = useColors()
  const common = useCommonStyles()

  const scale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Animated.View style={[styles.fab, animatedStyle]}>
      <GlassView intensity={20} borderRadius={30} style={styles.glass}>
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
          <FolderPlus size={26} color={colors.text} strokeWidth={1.7} />
        </Pressable>
      </GlassView>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 36,
    right: Space.base,
  },
  glass: {
    borderRadius: 30,
  },
  btn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
