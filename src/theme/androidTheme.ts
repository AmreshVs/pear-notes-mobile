import { createMaterial3Theme } from '@pchmn/expo-material3-theme'
import type { MD3Theme } from 'react-native-paper'
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper'

export const pearGold = '#DCA323'

export const pearM3Theme = createMaterial3Theme(pearGold)

const obsidianOverrides = {
  background: '#090909',
  surface: '#1c1c1e',
  surfaceVariant: '#262628',
  surfaceContainer: '#121214',
  surfaceContainerLow: '#0e0e10',
  surfaceContainerHigh: '#222224',
  surfaceContainerHighest: '#2a2a2c',
  elevation: {
    level0: 'transparent',
    level1: '#121214',
    level2: '#1c1c1e',
    level3: '#222224',
    level4: '#262628',
    level5: '#2a2a2c',
  },
  primary: pearGold,
  onPrimary: '#000000',
  primaryContainer: pearGold,
  onPrimaryContainer: '#000000',
  secondaryContainer: '#1e1e1e',
  onSecondaryContainer: '#ffffff',
  outline: '#272727',
  outlineVariant: 'rgba(255, 255, 255, 0.12)',
}

const lightOverrides = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceVariant: '#F3F4F6',
  surfaceContainer: '#FFFFFF',
  surfaceContainerLow: '#FFFFFF',
  surfaceContainerHigh: '#F9FAFB',
  surfaceContainerHighest: '#E5E7EB',
  elevation: {
    level0: 'transparent',
    level1: '#FFFFFF',
    level2: '#F9FAFB',
    level3: '#F3F4F6',
    level4: '#E5E7EB',
    level5: '#D1D5DB',
  },
  primary: pearGold,
  onPrimary: '#FFFFFF',
  primaryContainer: pearGold,
  onPrimaryContainer: '#000000',
  secondaryContainer: '#F3F4F6',
  onSecondaryContainer: '#111827',
  outline: '#E5E7EB',
  outlineVariant: 'rgba(0, 0, 0, 0.08)',
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
