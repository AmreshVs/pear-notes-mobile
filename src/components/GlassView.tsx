import React, { memo, useMemo } from 'react'
import { StyleSheet, View as DefaultView, ViewProps, ViewStyle } from 'react-native'
import { BlurView } from 'expo-blur'
import { GlassView as ExpoGlassView } from 'expo-glass-effect'

import { useReduceTransparency } from '@/hooks/useReduceTransparency'

import { createThemedStylesheet, useTheme } from './Themed'

interface GlassViewProps extends ViewProps {
  intensity?: number
  borderRadius?: number
  style?: ViewStyle
  isInteractive?: boolean
  opaqueColor?: string
}

export const GlassView = memo(function GlassView({
  children,
  intensity = 20,
  borderRadius = 20,
  style,
  opaqueColor,
  ...props
}: GlassViewProps) {
  const styles = useStyles()
  const theme = useTheme()
  const reduceTransparency = useReduceTransparency()

  const blurTint = theme.isDark ? 'dark' : 'light'

  const containerStyle = useMemo(
    () => [styles.container, { borderRadius }, style],
    [borderRadius, styles.container, style],
  )

  const opaqueStyle = useMemo(
    () => [
      styles.container,
      styles.opaque,
      { borderRadius },
      style,
      opaqueColor ? { backgroundColor: opaqueColor } : null,
    ],
    [borderRadius, styles.container, styles.opaque, style, opaqueColor],
  )

  const blurStyle = useMemo(() => [StyleSheet.absoluteFill, { borderRadius }], [borderRadius])

  if (reduceTransparency) {
    return (
      <DefaultView {...props} style={opaqueStyle}>
        {children}
      </DefaultView>
    )
  }

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
      borderColor: theme.colors.glassBorder,
    },
    opaque: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
    },
  })
  return styles
})
