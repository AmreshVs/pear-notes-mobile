import { BlurView } from 'expo-blur'
import { GlassView as ExpoGlassView } from 'expo-glass-effect'
import React, { memo, useMemo } from 'react'
import { StyleSheet, ViewProps, ViewStyle } from 'react-native'

import { Theme, useThemedStyles } from './Themed'

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
  const styles = useThemedStyles(createStyles)

  const containerStyle = useMemo(
    () => [styles.container, { borderRadius }, style],
    [borderRadius, styles.container, style],
  )

  const blurStyle = useMemo(() => [StyleSheet.absoluteFill, { borderRadius }], [borderRadius])

  return (
    <ExpoGlassView {...props} style={containerStyle}>
      <BlurView intensity={intensity} tint={styles.blurTint} style={blurStyle} />
      {children}
    </ExpoGlassView>
  )
})

const createStyles = (theme: Theme) => ({
  ...StyleSheet.create({
    container: {
      overflow: 'hidden',
      backgroundColor: theme.colors.glassBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.glassBorder,
    },
  }),
  blurTint: (theme.isDark ? 'dark' : 'light') as 'dark' | 'light',
})
