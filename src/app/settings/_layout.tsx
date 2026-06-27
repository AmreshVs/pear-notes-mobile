import { Stack } from 'expo-router'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'

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
        headerBackTitle: t('layouts.settings'),
      }}
    >
      <Stack.Screen name="index" options={{ title: t('layouts.settings') }} />
      <Stack.Screen name="sync" options={{ title: t('layouts.linkAndSync') }} />
      <Stack.Screen name="backup" options={{ title: t('layouts.backupRestore') }} />
      <Stack.Screen name="storage" options={{ title: t('layouts.storage') }} />
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
