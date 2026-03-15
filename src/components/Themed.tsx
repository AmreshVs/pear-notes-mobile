import { getTheme } from '@pear-notes/core/store/slices/settingsSlice.js'
import React, { useMemo } from 'react'
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

type ThemeProps = {
  lightColor?: string
  darkColor?: string
}

export type TextProps = ThemeProps &
  DefaultText['props'] & {
    variant?: keyof typeof Typography
  }
export type ViewProps = ThemeProps & DefaultView['props']

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, variant = 'body', ...otherProps } = props
  const theme = useTheme()

  const color =
    theme.colorScheme === 'light' ? lightColor || theme.colors.text : darkColor || theme.colors.text
  const typographyStyle = Typography[variant]

  return <DefaultText style={[{ color }, typographyStyle, style]} {...otherProps} />
}

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props
  const theme = useTheme()

  const backgroundColor =
    theme.colorScheme === 'light'
      ? lightColor || theme.colors.background
      : darkColor || theme.colors.background

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />
}

export function Container(props: ViewProps) {
  const theme = useTheme()
  return <View {...props} style={[{ flex: 1, padding: theme.spacing.md }, props.style]} />
}

export function Card(props: ViewProps) {
  const theme = useTheme()
  return (
    <View
      {...props}
      style={[
        {
          padding: theme.spacing.md,
          borderRadius: theme.layout.borderRadius.md,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        props.style,
      ]}
    />
  )
}

export function GlassCard(props: ViewProps) {
  const theme = useTheme()
  return (
    <View
      {...props}
      style={[
        {
          padding: theme.spacing.md,
          borderRadius: 24,
          backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
          borderWidth: 1,
          borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          boxShadow: theme.isDark
            ? '0 8px 32px rgba(0, 0, 0, 0.3)'
            : '0 8px 32px rgba(0, 0, 0, 0.1)',
        },
        props.style,
      ]}
    />
  )
}
