import React, { memo, useMemo } from 'react'
import { StyleSheet, ViewProps, ViewStyle } from 'react-native'
import { BlurView } from 'expo-blur'
import { GlassView as ExpoGlassView } from 'expo-glass-effect'

import { createThemedStylesheet, useTheme } from './Themed'

interface GlassViewProps extends ViewProps {
  intensity?: number
  borderRadius?: number
  style?: ViewStyle
  isInteractive?: boolean
}

export const GlassView = memo(function GlassView({
  children,
  intensity = 20,
  borderRadius = 20,
  style,
  ...props
}: GlassViewProps) {
  const styles = useStyles()
  const theme = useTheme()

  const blurTint = theme.isDark ? 'dark' : 'light'

  const containerStyle = useMemo(
    () => [styles.container, { borderRadius }, style],
    [borderRadius, styles.container, style],
  )

  const blurStyle = useMemo(() => [StyleSheet.absoluteFill, { borderRadius }], [borderRadius])

  return (
    <ExpoGlassView {...props} style={containerStyle}>
      <BlurView intensity={intensity} tint={blurTint} style={blurStyle} />
      {children}
    </ExpoGlassView>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      overflow: 'hidden',
      backgroundColor: theme.colors.glassBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.glassBorder,
    },
  })
  return styles
})
