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
  background: '#EFEFEF',
  surface: '#FFFFFF',
  surfaceVariant: '#E4E4E4',
  surfaceContainer: '#FFFFFF',
  surfaceContainerLowest: '#F5F5F5',
  surfaceContainerLow: '#F5F5F5',
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
  primary: pearGold,
  onPrimary: '#000000',
  primaryContainer: pearGold,
  onPrimaryContainer: '#000000',
  secondary: '#5C5C5C',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#E8E8E8',
  onSecondaryContainer: '#1A1A1A',
  onSurface: '#111111',
  onSurfaceVariant: '#555555',
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
