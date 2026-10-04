import type { MD3Theme } from 'react-native-paper'
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper'
import { createMaterial3Theme } from '@pchmn/expo-material3-theme'

export const pearGold = '#DCA323'
export const pearGoldForeground = '#1a1300'
export const pearGoldLight = '#DCA323'
export const pearGoldText = '#eba503'

export const pearM3Theme = createMaterial3Theme(pearGold)

export const materialYouLightOverrides = {
  surfaceContainerHigh: '#FFFFFF',
  background: '#f2f2f7',
  editorBackground: '#ffffff',
  warning: '#a15200',
}

const obsidianOverrides = {
  background: '#090909',
  editorBackground: '#090909',
  warning: '#ff9f0a',
  surface: '#1e1e20',
  surfaceVariant: '#191919',
  surfaceContainer: '#1e1e20',
  surfaceContainerLow: '#1a1a1a',
  surfaceContainerHigh: '#191919',
  surfaceContainerHighest: '#2a2a2c',
  elevation: {
    level0: 'transparent',
    level1: '#1e1e20',
    level2: '#191919',
    level3: '#252527',
    level4: '#2a2a2c',
    level5: '#303032',
  },
  primary: pearGold,
  onPrimary: pearGoldForeground,
  primaryContainer: pearGold,
  onPrimaryContainer: pearGoldForeground,
  secondaryContainer: '#191919',
  onSecondaryContainer: '#ffffff',
  onSurface: '#ffffff',
  onSurfaceVariant: '#b0b0b5',
  onBackground: '#ffffff',
  outline: '#38383a',
  outlineVariant: 'rgba(255, 255, 255, 0.1)',
  error: '#EF5350',
}

const lightOverrides = {
  background: '#f2f2f7',
  editorBackground: '#ffffff',
  warning: '#a15200',
  surface: '#FFFFFF',
  surfaceVariant: '#E4E4E4',
  surfaceContainer: '#FFFFFF',
  surfaceContainerLowest: '#F5F5F5',
  surfaceContainerLow: '#f2f2f7',
  surfaceContainerHigh: '#FFFFFF',
  surfaceContainerHighest: '#E8E8E8',
  elevation: {
    level0: 'transparent',
    level1: '#FFFFFF',
    level2: '#F5F5F5',
    level3: '#EFEFEF',
    level4: '#E8E8E8',
    level5: '#E0E0E0',
  },
  primary: pearGoldText,
  onPrimary: pearGoldForeground,
  primaryContainer: pearGoldLight,
  onPrimaryContainer: pearGoldForeground,
  secondary: '#5C5C5C',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#E8E8E8',
  onSecondaryContainer: '#1A1A1A',
  onSurface: '#111111',
  onSurfaceVariant: '#777777',
  onBackground: '#111111',
  outline: '#D0D0D0',
  outlineVariant: 'rgba(0, 0, 0, 0.10)',
  error: '#B3261E',
  errorContainer: '#F9DEDC',
  onError: '#FFFFFF',
  onErrorContainer: '#8C1D18',
}

export const AndroidLightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...pearM3Theme.light,
    ...lightOverrides,
    elevation: {
      ...(MD3LightTheme.colors.elevation || {}),
      ...lightOverrides.elevation,
    },
  },
}

export const AndroidDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...pearM3Theme.dark,
    ...obsidianOverrides,
    elevation: {
      ...(MD3DarkTheme.colors.elevation || {}),
      ...obsidianOverrides.elevation,
    },
  },
}
