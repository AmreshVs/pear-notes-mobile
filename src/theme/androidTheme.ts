import { createMaterial3Theme } from '@pchmn/expo-material3-theme'
import type { MD3Theme } from 'react-native-paper'
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper'

export const pearGold = '#DCA323'

export const pearM3Theme = createMaterial3Theme(pearGold)

const obsidianOverrides = {
  background: '#1a1a1a',
  surface: '#252527',
  surfaceVariant: '#2c2c2e',
  surfaceContainer: '#252527',
  surfaceContainerLow: '#202022',
  surfaceContainerHigh: '#2c2c2e',
  surfaceContainerHighest: '#38383a',
  elevation: {
    level0: 'transparent',
    level1: '#252527',
    level2: '#2c2c2e',
    level3: '#303032',
    level4: '#38383a',
    level5: '#3e3e40',
  },
  primary: pearGold,
  onPrimary: '#000000',
  primaryContainer: pearGold,
  onPrimaryContainer: '#000000',
  secondaryContainer: '#333335',
  onSecondaryContainer: '#ffffff',
  outline: '#3a3a3c',
  outlineVariant: 'rgba(255, 255, 255, 0.12)',
}

const lightOverrides = {
  background: '#f2f2f7',
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
