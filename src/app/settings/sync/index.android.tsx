import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router, Stack } from 'expo-router'

import { AndroidSettingsAppBar } from '@/components/android/AndroidSettingsAppBar'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { BackgroundSyncSection } from '@/components/settings/BackgroundSyncSection.android'
import { MediaSyncSection } from '@/components/settings/MediaSyncSection'
import { SyncStatusSection } from '@/components/settings/SyncStatusSection'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_48,
  UI_SIZE_8,
  UI_SIZE_16,
  UI_SIZE_22,
  UI_SIZE_28,
  UI_SIZE_40,
  UI_SIZE_48,
  UI_SIZE_54,
  UI_SIZE_96,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  primaryContainer?: string
  onSurfaceVariant?: string
  surfaceContainerHigh?: string
}

export default function AndroidSyncScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()

  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])

  const openDiagnostics = useCallback(() => {
    router.push('/settings/debug' as never)
  }, [])

  return (
    <View style={styles.root}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <Stack.Screen options={{ headerShown: false }} />

      <AndroidSettingsAppBar title={t('settings.sync.screenTitle')} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroContainer}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="sync" size={UI_ICON_SIZE_48} color={c.primary} />
          </View>
          <Text style={styles.heroDesc}>{t('settings.sync.screenDesc')}</Text>
        </View>

        <SyncStatusSection />
        <BackgroundSyncSection />
        <MediaSyncSection />

        <Pressable
          onPress={openDiagnostics}
          android_ripple={ripple}
          style={styles.diagnosticsBtn}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="stethoscope" size={UI_ICON_SIZE_20} color={c.onSurface} />
          <Text style={styles.diagnosticsText}>{t('debug.openDiagnostics')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}

const useSyncScreenHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3, insets }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    root: {
      ...commonStyles.flex1,
      backgroundColor: c.background,
    },
    scrollContent: {
      paddingHorizontal: UI_SIZE_16,
      paddingBottom: insets.bottom + UI_SIZE_40,
    },
    heroContainer: {
      alignItems: 'center',
      marginBottom: UI_SIZE_28,
    },
    heroIcon: {
      width: UI_SIZE_96,
      height: UI_SIZE_96,
      borderRadius: UI_SIZE_48,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
      ...commonStyles.centered,
      marginBottom: UI_SIZE_16,
    },
    heroDesc: {
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
      fontFamily: FontFamily.regular,
      textAlign: 'center',
      lineHeight: UI_SIZE_22,
      paddingHorizontal: UI_SIZE_8,
    },
    diagnosticsBtn: {
      overflow: 'hidden',
      minHeight: UI_SIZE_54,
      borderRadius: UI_SIZE_9999,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      ...commonStyles.row,
      justifyContent: 'center',
      gap: UI_SIZE_8,
      marginTop: UI_SIZE_16,
    },
    diagnosticsText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
    },
  })
  return styles
}, useSyncScreenHooks)
