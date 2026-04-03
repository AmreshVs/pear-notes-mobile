import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans'
import { useMaterial3Theme } from '@pchmn/expo-material3-theme'
import { useFonts } from 'expo-font'
import React, { useMemo } from 'react'
import { Platform } from 'react-native'
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper'
import { useSelector } from 'react-redux'

import { useResolvedColorScheme } from '@/components/Themed'
import { AndroidDarkTheme, AndroidLightTheme, pearGold } from '@/theme/androidTheme'

export type AndroidColorTheme = 'pear' | 'material-you'

const getAndroidColorTheme = (state: any): AndroidColorTheme =>
  state.settings?.androidColorTheme ?? 'pear'

interface AndroidPaperProviderProps {
  children: React.ReactNode
}

export function AndroidPaperProvider({ children }: AndroidPaperProviderProps) {
  const colorScheme = useResolvedColorScheme()
  const isDark = colorScheme === 'dark'
  const androidColorTheme = useSelector(getAndroidColorTheme)

  const { theme: m3Theme } = useMaterial3Theme({ fallbackSourceColor: pearGold })

  useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  })

  const paperTheme = useMemo(() => {
    if (androidColorTheme === 'material-you') {
      const scheme = isDark ? m3Theme.dark : m3Theme.light
      return {
        ...(isDark ? MD3DarkTheme : MD3LightTheme),
        colors: {
          ...(isDark ? MD3DarkTheme.colors : MD3LightTheme.colors),
          ...scheme,
        },
      }
    }
    return isDark ? AndroidDarkTheme : AndroidLightTheme
  }, [isDark, androidColorTheme, m3Theme])

  if (Platform.OS !== 'android') {
    return <>{children}</>
  }

  return <PaperProvider theme={paperTheme}>{children}</PaperProvider>
}
