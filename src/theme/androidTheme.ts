import { createMaterial3Theme } from '@pchmn/expo-material3-theme'
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper'
import type { MD3Theme } from 'react-native-paper'

export const pearGold = '#DCA323'

export const pearM3Theme = createMaterial3Theme(pearGold)

export const AndroidLightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...pearM3Theme.light,
  },
}

export const AndroidDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...pearM3Theme.dark,
  },
}
