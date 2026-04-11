import { Stack } from 'expo-router'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { useTheme } from '@/components/Themed'

export default function SettingsLayout() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontWeight: '600', fontSize: 17 },
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerBackTitle: t('layouts.settings'),
      }}
    >
      <Stack.Screen name="index" options={{ title: t('layouts.settings') }} />
      <Stack.Screen name="sync" options={{ title: t('layouts.linkAndSync') }} />
      <Stack.Screen name="backup" options={{ title: t('layouts.backupRestore') }} />
    </Stack>
  )
}
