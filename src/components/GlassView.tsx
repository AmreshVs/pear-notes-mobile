import { BlurView } from 'expo-blur'
import { GlassView as ExpoGlassView } from 'expo-glass-effect'
import React from 'react'
import { StyleSheet, ViewProps, ViewStyle } from 'react-native'

import { useTheme } from './Themed'

interface GlassViewProps extends ViewProps {
  intensity?: number
  borderRadius?: number
  style?: ViewStyle
}

export function GlassView({
  children,
  intensity = 20,
  borderRadius = 20,
  style,
  ...props
}: GlassViewProps) {
  const { isDark } = useTheme()

  return (
    <ExpoGlassView
      {...props}
      style={[
        styles.container,
        {
          borderRadius,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        },
        style,
      ]}
    >
      <BlurView
        intensity={intensity}
        tint={isDark ? 'dark' : 'light'}
        style={[StyleSheet.absoluteFill, { borderRadius }]}
      />
      {children}
    </ExpoGlassView>
  )
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
})
