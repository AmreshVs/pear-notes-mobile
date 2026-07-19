import { getTheme } from '@pear-notes/core/store/slices/settingsSlice.js'
import React, { memo, useMemo } from 'react'
import {
  StyleSheet,
  Text as DefaultText,
  type TextStyle,
  View as DefaultView,
  useColorScheme as useDeviceColorScheme,
} from 'react-native'
import { useSelector } from 'react-redux'

import Colors from '@/constants/Colors'
import { commonStyles, FontFamily } from '@/constants/commonStyles'
import { Layout, Spacing } from '@/constants/Spacing'
import { Typography } from '@/constants/Typography'

const WEIGHT_TO_FONT_FAMILY: Record<string, string> = {
  '400': FontFamily.regular,
  '500': FontFamily.medium,
  '600': FontFamily.semiBold,
  '700': FontFamily.bold,
  '800': FontFamily.extraBold,
  '900': FontFamily.extraBold,
}

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

export const createThemedStylesheet = <T extends object>(builder: (theme: Theme) => T) => {
  return () => {
    const theme = useTheme()
    const stylesheet = useMemo(() => builder(theme), [theme])
    return stylesheet
  }
}

export const createThemedStylesheetWithHooks = <T extends object, Output>(
  builder: (theme: Theme, hooksOutput: Output) => T,
  hooks: () => Output,
) => {
  return () => {
    const theme = useTheme()
    const hooksOutput = hooks()
    const stylesheet = useMemo(() => builder(theme, hooksOutput), [hooksOutput, theme])
    return stylesheet
  }
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

  const combinedStyle = useMemo(() => {
    const flat = StyleSheet.flatten([{ color }, typographyStyle, style]) as TextStyle
    if (!flat.fontFamily) {
      flat.fontFamily =
        WEIGHT_TO_FONT_FAMILY[String(flat.fontWeight ?? '400')] ?? FontFamily.regular
    }
    return flat
  }, [color, typographyStyle, style])

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
  const styles = useStyles()
  const combinedStyle = useMemo(
    () => [styles.container, props.style],
    [styles.container, props.style],
  )
  return <View {...props} style={combinedStyle} />
})

export const Card = memo(function Card(props: ViewProps) {
  const styles = useStyles()
  const combinedStyle = useMemo(() => [styles.card, props.style], [styles.card, props.style])
  return <View {...props} style={combinedStyle} />
})

export const GlassCard = memo(function GlassCard(props: ViewProps) {
  const styles = useStyles()
  const combinedStyle = useMemo(
    () => [styles.glassCard, props.style],
    [styles.glassCard, props.style],
  )
  return <View {...props} style={combinedStyle} />
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      ...commonStyles.flex1,
      padding: theme.spacing.md,
    },
    card: {
      padding: theme.spacing.md,
      borderRadius: theme.layout.borderRadius.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    glassCard: {
      padding: theme.spacing.md,
      borderRadius: 24,
      backgroundColor: theme.colors.glassBackground,
      borderWidth: 1,
      borderColor: theme.colors.glassBorder,
      boxShadow: `0 8px 32px ${theme.colors.glassShadow}`,
    },
  })
  return styles
})
