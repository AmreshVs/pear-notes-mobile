import { createMaterial3Theme } from '@pchmn/expo-material3-theme'
import type { MD3Theme } from 'react-native-paper'
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper'

export const pearGold = '#DCA323'

export const pearM3Theme = createMaterial3Theme(pearGold)

const obsidianOverrides = {
  background: '#090909',
  surface: '#090909',
  surfaceVariant: '#1a1a1a',
  surfaceContainer: '#121212',
  surfaceContainerLow: '#0e0e0e',
  surfaceContainerHigh: '#1e1e1e',
  surfaceContainerHighest: '#2a2a2a',
  elevation: {
    level0: 'transparent',
    level1: '#121212',
    level2: '#161616',
    level3: '#1a1a1a',
    level4: '#1e1e1e',
    level5: '#222222',
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
