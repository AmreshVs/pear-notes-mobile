import React, { type ReactNode, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform, Pressable, StyleSheet, View } from 'react-native'
import { router, Stack } from 'expo-router'

import { isMultiVaultEnabled } from '@pear-notes/core/constant.js'

import { ScreenEdgeFades } from '@/components/ScreenEdgeFades'
import { SettingsMenuColumn } from '@/components/settings/SettingsMenuColumn'
import { createThemedStylesheet, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  Radii,
  SETTINGS_MENU_WIDTH,
  SETTINGS_PANEL_HEIGHT_RATIO,
  SETTINGS_PANEL_MAX_WIDTH,
  SETTINGS_PANEL_WIDTH_RATIO,
} from '@/constants/commonStyles'
import { HIDDEN_SCROLL_EDGE_EFFECTS } from '@/constants/navigation'
import { useIsLargeScreen } from '@/hooks/useIsLargeScreen'

export default function SettingsLayout() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const isLargeScreen = useIsLargeScreen()
  const handleDismiss = useCallback(() => {
    router.dismissAll()
    router.back()
  }, [])

  const renderScreenLayout = useCallback(
    ({ children }: { children: ReactNode }) => (
      <View style={commonStyles.flex1}>
        {children}
        {!isLargeScreen && <ScreenEdgeFades variant="sheet" />}
      </View>
    ),
    [isLargeScreen],
  )

  const stack = (
    <Stack
      screenLayout={Platform.OS === 'ios' ? renderScreenLayout : undefined}
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: styles.headerTitle,
        headerTransparent: !isLargeScreen,
        headerStyle: isLargeScreen ? styles.headerBackground : undefined,
        scrollEdgeEffects: HIDDEN_SCROLL_EDGE_EFFECTS,
        contentStyle: styles.content,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        animation: isLargeScreen ? 'none' : undefined,
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
      <Stack.Screen
        name="vaults"
        redirect={!isMultiVaultEnabled()}
        options={{ title: t('layouts.vaults') }}
      />
      <Stack.Screen
        name="vaults/join"
        redirect={!isMultiVaultEnabled()}
        options={{ title: t('vaults.join.sectionTitle') }}
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
      <Stack.Screen name="debug/error-log" options={{ title: t('layouts.errorLog') }} />
    </Stack>
  )

  if (!isLargeScreen) return <View style={styles.opaqueRoot}>{stack}</View>

  const split = (
    <View style={styles.split}>
      <View style={styles.menu}>
        <SettingsMenuColumn />
      </View>
      <View style={styles.detail}>{stack}</View>
    </View>
  )

  if (Platform.OS !== 'ios') return split

  return (
    <View style={styles.backdrop}>
      <Pressable
        style={styles.backdropPress}
        onPress={handleDismiss}
        accessibilityRole="button"
        accessibilityLabel={t('common.done')}
      />
      <View style={styles.panel}>{split}</View>
    </View>
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
    opaqueRoot: {
      ...commonStyles.flex1,
      backgroundColor: theme.colors.backgroundElevated,
    },
    headerBackground: {
      backgroundColor: theme.colors.backgroundElevated,
    },
    split: {
      ...commonStyles.flex1,
      ...commonStyles.row,
      backgroundColor: theme.colors.backgroundElevated,
      overflow: 'hidden',
    },
    menu: {
      width: SETTINGS_MENU_WIDTH,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: theme.colors.borderSecondary,
    },
    detail: {
      ...commonStyles.flex1,
      overflow: 'hidden',
    },
    backdrop: {
      ...commonStyles.flex1,
      ...commonStyles.centered,
      backgroundColor: theme.colors.scrim,
    },
    backdropPress: {
      ...StyleSheet.absoluteFill,
    },
    panel: {
      width: SETTINGS_PANEL_WIDTH_RATIO,
      height: SETTINGS_PANEL_HEIGHT_RATIO,
      maxWidth: SETTINGS_PANEL_MAX_WIDTH,
      borderRadius: Radii.sheet,
      overflow: 'hidden',
      backgroundColor: theme.colors.backgroundElevated,
    },
  })
  return styles
})
