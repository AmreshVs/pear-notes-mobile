import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
import { Stack } from 'expo-router'

import { createThemedStylesheet, useTheme } from '@/components/Themed'
import { FontSize, FontWeight } from '@/constants/commonStyles'

export default function SettingsLayout() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: styles.headerTitle,
        headerStyle: styles.header,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ title: t('layouts.settings') }} />
      <Stack.Screen name="general" options={{ title: t('layouts.general') }} />
      <Stack.Screen name="privacy" options={{ title: t('layouts.privacyAndSecurity') }} />
      <Stack.Screen name="sync" options={{ title: t('layouts.linkAndSync') }} />
      <Stack.Screen name="backup" options={{ title: t('layouts.backupRestore') }} />
      <Stack.Screen name="backup-password" options={{ title: t('layouts.backupPassword') }} />
      <Stack.Screen name="note-lock-password" options={{ title: t('layouts.noteLockPassword') }} />
      <Stack.Screen name="storage" options={{ title: t('layouts.storage') }} />
      <Stack.Screen name="activity" options={{ title: t('layouts.activity') }} />
      <Stack.Screen name="font" options={{ title: t('settings.general.fontFamily') }} />
    </Stack>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    headerTitle: {
      color: theme.colors.text,
      fontWeight: FontWeight.semibold,
      fontSize: FontSize.subtitle,
    },
    header: {
      backgroundColor: theme.colors.background,
    },
  })
  return styles
})
