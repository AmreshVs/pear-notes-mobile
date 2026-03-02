import { Stack } from 'expo-router'
import React from 'react'

import { useTheme } from '@/components/Themed'

export default function SettingsLayout() {
  const { colors } = useTheme()
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
      <Stack.Screen name="sync" options={{ title: 'Link and Sync' }} />
    </Stack>
  )
}
