import React, { createContext, memo, useContext, useMemo, useRef } from 'react'
import {
  Appearance,
  StyleSheet,
  Text as DefaultText,
  type TextStyle,
  useColorScheme as useDeviceColorScheme,
  useWindowDimensions,
  View as DefaultView,
} from 'react-native'
import { useSelector } from 'react-redux'

import { getTheme } from '@pear-notes/core/store/slices/settingsSlice.js'

import Colors from '@/constants/Colors'
import { commonStyles, FontFamily } from '@/constants/commonStyles'
import { Layout, Spacing } from '@/constants/Spacing'
import { Typography } from '@/constants/Typography'
import { useSystemReduceMotion } from '@/hooks/useReduceMotion'

const WEIGHT_TO_FONT_FAMILY: Record<string, string> = {
  '400': FontFamily.regular,
  '500': FontFamily.medium,
  '600': FontFamily.semiBold,
  '700': FontFamily.bold,
  '800': FontFamily.extraBold,
  '900': FontFamily.extraBold,
}

const ColorSchemeContext = createContext<'light' | 'dark' | null>(null)
const FontScaleContext = createContext(1)
const ReduceMotionContext = createContext(false)

export function useFontScale(): number {
  return useContext(FontScaleContext)
}

export function useReduceMotion(): boolean {
  return useContext(ReduceMotionContext)
}

export function ColorSchemeProvider({ children }: { children: React.ReactNode }) {
  const deviceColorScheme = useDeviceColorScheme()
  const { fontScale } = useWindowDimensions()
  const reduceMotion = useSystemReduceMotion()
  const themeSetting: string = useSelector(getTheme) ?? 'system'

  const colorScheme = useMemo<'light' | 'dark'>(() => {
    if (themeSetting === 'dark') return 'dark'
    if (themeSetting === 'light') return 'light'
    return deviceColorScheme === 'dark' ? 'dark' : 'light'
  }, [themeSetting, deviceColorScheme])

  return (
    <ColorSchemeContext.Provider value={colorScheme}>
      <FontScaleContext.Provider value={fontScale}>
        <ReduceMotionContext.Provider value={reduceMotion}>{children}</ReduceMotionContext.Provider>
      </FontScaleContext.Provider>
    </ColorSchemeContext.Provider>
  )
}

export function useResolvedColorScheme(): 'light' | 'dark' {
  const colorScheme = useContext(ColorSchemeContext)
  return colorScheme ?? (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light')
}

export type Theme = {
  colors: (typeof Colors)['light']
  colorScheme: 'light' | 'dark'
  isDark: boolean
  spacing: typeof Spacing
  layout: typeof Layout
  typography: typeof Typography
}

const THEMES: Record<'light' | 'dark', Theme> = {
  light: {
    colors: Colors.light,
    colorScheme: 'light',
    isDark: false,
    spacing: Spacing,
    layout: Layout,
    typography: Typography,
  },
  dark: {
    colors: Colors.dark,
    colorScheme: 'dark',
    isDark: true,
    spacing: Spacing,
    layout: Layout,
    typography: Typography,
  },
}

export function useTheme(): Theme {
  return THEMES[useResolvedColorScheme()]
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
  const cache = new Map<string, T>()
  return () => {
    const theme = useTheme()
    let stylesheet = cache.get(theme.colorScheme)
    if (!stylesheet) {
      stylesheet = builder(theme)
      cache.set(theme.colorScheme, stylesheet)
    }
    return stylesheet
  }
}

function isShallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false

  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false

  return aKeys.every((key) =>
    Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  )
}

export const createThemedStylesheetWithHooks = <T extends object, Output>(
  builder: (theme: Theme, hooksOutput: Output) => T,
  hooks: () => Output,
) => {
  return () => {
    const theme = useTheme()
    const hooksOutput = hooks()
    const cacheRef = useRef<{ theme: Theme; hooksOutput: Output; stylesheet: T } | null>(null)

    if (
      !cacheRef.current ||
      cacheRef.current.theme !== theme ||
      !isShallowEqual(cacheRef.current.hooksOutput, hooksOutput)
    ) {
      cacheRef.current = { theme, hooksOutput, stylesheet: builder(theme, hooksOutput) }
    }

    return cacheRef.current.stylesheet
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

  const fontScale = useFontScale()

  const color =
    theme.colorScheme === 'light' ? lightColor || theme.colors.text : darkColor || theme.colors.text
  const typographyStyle = Typography[variant]

  const combinedStyle = useMemo(() => {
    const flat = StyleSheet.flatten([{ color }, typographyStyle, style]) as TextStyle
    if (!flat.fontFamily) {
      flat.fontFamily =
        WEIGHT_TO_FONT_FAMILY[String(flat.fontWeight ?? '400')] ?? FontFamily.regular
    }
    if (typeof flat.lineHeight === 'number') {
      flat.lineHeight = flat.lineHeight * fontScale
    }
    return flat
  }, [color, typographyStyle, style, fontScale])

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
  })
  return styles
})
