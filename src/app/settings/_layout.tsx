import React, { type ReactNode, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform, StyleSheet, View } from 'react-native'
import { Stack } from 'expo-router'

import { ScreenEdgeFades } from '@/components/ScreenEdgeFades'
import { createThemedStylesheet, useTheme } from '@/components/Themed'
import { commonStyles, FontSize, FontWeight } from '@/constants/commonStyles'
import { HIDDEN_SCROLL_EDGE_EFFECTS } from '@/constants/navigation'

export default function SettingsLayout() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()

  const renderScreenLayout = useCallback(
    ({ children }: { children: ReactNode }) => (
      <View style={commonStyles.flex1}>
        {children}
        <ScreenEdgeFades variant="sheet" />
      </View>
    ),
    [],
  )

  return (
    <Stack
      screenLayout={Platform.OS === 'ios' ? renderScreenLayout : undefined}
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: styles.headerTitle,
        headerTransparent: true,
        scrollEdgeEffects: HIDDEN_SCROLL_EDGE_EFFECTS,
        contentStyle: styles.content,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ title: t('layouts.settings') }} />
      <Stack.Screen name="general" options={{ title: t('layouts.general') }} />
      <Stack.Screen name="privacy" options={{ title: t('layouts.privacyAndSecurity') }} />
      <Stack.Screen name="on-device-ai" options={{ title: t('layouts.onDeviceAi') }} />
      <Stack.Screen name="on-device-ai/feature" options={{ title: t('layouts.onDeviceAi') }} />
      <Stack.Screen
        name="on-device-ai/models"
        options={{ title: t('settings.onDeviceAi.modelsTitle') }}
      />
      <Stack.Screen name="devices" options={{ title: t('layouts.linkDevices') }} />
      <Stack.Screen name="sync" options={{ title: t('layouts.sync') }} />
      <Stack.Screen name="backup" options={{ title: t('layouts.backupRestore') }} />
      <Stack.Screen name="backup-password" options={{ title: t('layouts.backupPassword') }} />
      <Stack.Screen name="note-lock-password" options={{ title: t('layouts.noteLockPassword') }} />
      <Stack.Screen name="storage" options={{ title: t('layouts.storage') }} />
      <Stack.Screen name="activity" options={{ title: t('layouts.activity') }} />
      <Stack.Screen name="font" options={{ title: t('settings.general.fontFamily') }} />
      <Stack.Screen name="debug" options={{ title: t('layouts.debug') }} />
    </Stack>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    headerTitle: {
      color: theme.colors.text,
      fontWeight: FontWeight.bold,
      fontSize: FontSize.subtitle,
    },
    content: {
      backgroundColor: theme.colors.backgroundElevated,
    },
  })
  return styles
})
