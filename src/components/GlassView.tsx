import { BlurView } from 'expo-blur'
import { GlassView as ExpoGlassView } from 'expo-glass-effect'
import React, { memo, useMemo } from 'react'
import { StyleSheet, ViewProps, ViewStyle } from 'react-native'

import { useTheme } from './Themed'

interface GlassViewProps extends ViewProps {
  intensity?: number
  borderRadius?: number
  style?: ViewStyle
}

export const GlassView = memo(function GlassView({
  children,
  intensity = 20,
  borderRadius = 20,
  style,
  ...props
}: GlassViewProps) {
  const { isDark } = useTheme()

  const containerStyle = useMemo(
    () => [
      styles.container,
      {
        borderRadius,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
      },
      style,
    ],
    [borderRadius, isDark, style],
  )

  const blurStyle = useMemo(() => [StyleSheet.absoluteFill, { borderRadius }], [borderRadius])

  return (
    <ExpoGlassView {...props} style={containerStyle}>
      <BlurView intensity={intensity} tint={isDark ? 'dark' : 'light'} style={blurStyle} />
      {children}
    </ExpoGlassView>
  )
})

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
})
