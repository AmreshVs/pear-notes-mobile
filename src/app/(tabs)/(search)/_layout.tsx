import { Stack } from 'expo-router'
import React from 'react'

import { useTheme } from '@/components/Themed'

export default function SearchLayout() {
  const { colors } = useTheme()

  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerLargeStyle: { backgroundColor: 'transparent' },
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerLargeTitleStyle: { color: colors.text, fontWeight: '800' },
        headerTintColor: colors.primary,
        headerLargeTitle: true,
        headerBlurEffect: 'none',
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Search' }} />
    </Stack>
  )
}
