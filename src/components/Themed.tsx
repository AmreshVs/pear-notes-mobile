import { getTheme } from '@pear-notes/core/store/slices/settingsSlice.js'
import React, { memo, useMemo } from 'react'
import {
  Text as DefaultText,
  View as DefaultView,
  useColorScheme as useDeviceColorScheme,
} from 'react-native'
import { useSelector } from 'react-redux'

import Colors from '@/constants/Colors'
import { Layout, Spacing } from '@/constants/Spacing'
import { Typography } from '@/constants/Typography'

export function useResolvedColorScheme(): 'light' | 'dark' {
  const deviceColorScheme = useDeviceColorScheme()
  const themeSetting: string = useSelector(getTheme) ?? 'system'

  if (themeSetting === 'dark') return 'dark'
  if (themeSetting === 'light') return 'light'
  return deviceColorScheme === 'dark' ? 'dark' : 'light'
}

export type Theme = ReturnType<typeof useTheme>

export function useTheme() {
  const colorScheme = useResolvedColorScheme()
  const isDark = colorScheme === 'dark'

  return useMemo(
    () => ({
      colors: Colors[colorScheme],
      colorScheme,
      isDark,
      spacing: Spacing,
      layout: Layout,
      typography: Typography,
    }),
    [colorScheme, isDark],
  )
}

export function useColors() {
  const { colors } = useTheme()
  return colors
}

export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme()
  return useMemo(() => factory(theme), [factory, theme])
}

type ThemeProps = {
  lightColor?: string
  darkColor?: string
}

export type TextProps = ThemeProps &
  DefaultText['props'] & {
    variant?: keyof typeof Typography
  }
export type ViewProps = ThemeProps & DefaultView['props']

export const Text = memo(function Text(props: TextProps) {
  const { style, lightColor, darkColor, variant = 'body', ...otherProps } = props
  const theme = useTheme()

  const color =
    theme.colorScheme === 'light' ? lightColor || theme.colors.text : darkColor || theme.colors.text
  const typographyStyle = Typography[variant]

  const combinedStyle = useMemo(
    () => [{ color }, typographyStyle, style],
    [color, typographyStyle, style],
  )

  return <DefaultText style={combinedStyle} {...otherProps} />
})

export const View = memo(function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props
  const theme = useTheme()

  const backgroundColor =
    theme.colorScheme === 'light'
      ? lightColor || theme.colors.background
      : darkColor || theme.colors.background

  const combinedStyle = useMemo(() => [{ backgroundColor }, style], [backgroundColor, style])

  return <DefaultView style={combinedStyle} {...otherProps} />
})

export const Container = memo(function Container(props: ViewProps) {
  const theme = useTheme()
  const combinedStyle = useMemo(
    () => [{ flex: 1, padding: theme.spacing.md }, props.style],
    [theme.spacing.md, props.style],
  )
  return <View {...props} style={combinedStyle} />
})

export const Card = memo(function Card(props: ViewProps) {
  const theme = useTheme()
  const combinedStyle = useMemo(
    () => [
      {
        padding: theme.spacing.md,
        borderRadius: theme.layout.borderRadius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
      props.style,
    ],
    [
      theme.spacing.md,
      theme.layout.borderRadius.md,
      theme.colors.surface,
      theme.colors.border,
      props.style,
    ],
  )

  return <View {...props} style={combinedStyle} />
})

export const GlassCard = memo(function GlassCard(props: ViewProps) {
  const theme = useTheme()
  const combinedStyle = useMemo(
    () => [
      {
        padding: theme.spacing.md,
        borderRadius: 24,
        backgroundColor: theme.colors.glassBackground,
        borderWidth: 1,
        borderColor: theme.colors.glassBorder,
        boxShadow: `0 8px 32px ${theme.colors.glassShadow}`,
      },
      props.style,
    ],
    [theme.spacing.md, theme.colors, props.style],
  )

  return <View {...props} style={combinedStyle} />
})
