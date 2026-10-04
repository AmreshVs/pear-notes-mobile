import { useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native'
import { Easing, LinearTransition } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router, Stack, usePathname } from 'expo-router'

import { AndroidSettingsAppBar } from '@/components/android/AndroidSettingsAppBar'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { MotionView } from '@/components/MotionView'
import { VaultSettingsCard } from '@/components/settings/VaultSettingsCard'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_20,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_28,
  UI_SIZE_36,
  UI_SIZE_40,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { useIsLargeScreen } from '@/hooks/useIsLargeScreen'
import { type SettingsSection, useSettingsSectionGroups } from '@/hooks/useSettingsSections'
import { androidRipple } from '@/lib/androidRipple'
import { getAppVersionLabel } from '@/lib/appVersion'
import { hexWithAlpha } from '@/lib/backupUtils'

const SETTINGS_ROOT_PATH = '/settings'

export default function AndroidSettingsScreen() {
  const { t } = useTranslation()
  const isLargeScreen = useIsLargeScreen()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLargeScreen || pathname !== SETTINGS_ROOT_PATH) return
    router.push('/settings/general' as never)
  }, [isLargeScreen, pathname])
  const styles = useStyles()
  const theme = useTheme()
  const md3 = useMD3Theme()
  const c = md3.colors

  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])

  const sectionGroups = useSettingsSectionGroups()

  const renderSection = useCallback(
    ({ key, androidIcon, label, route }: SettingsSection, index: number) => (
      <View key={key}>
        {index > 0 && <View style={styles.rowDivider} />}
        <Pressable
          onPress={() => router.push(route as never)}
          android_ripple={ripple}
          style={styles.row}
        >
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name={androidIcon} size={UI_ICON_SIZE_20} color={c.primary} />
          </View>
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>{label}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={UI_ICON_SIZE_20} color={c.primary} />
        </Pressable>
      </View>
    ),
    [c.primary, ripple, styles],
  )

  const renderGroup = useCallback(
    (group: SettingsSection[], index: number) => (
      <MotionView
        key={group[0].group}
        layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
        style={index > 0 ? styles.groupSpaced : styles.group}
      >
        {group.map(renderSection)}
      </MotionView>
    ),
    [renderSection, styles.group, styles.groupSpaced],
  )

  return (
    <View style={styles.root}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <Stack.Screen options={{ headerShown: false }} />

      <AndroidSettingsAppBar title={t('settings.title')} showBack />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.scrollContent}>
          <VaultSettingsCard />
          {sectionGroups.map(renderGroup)}
        </View>
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>{t('settings.footer')}</Text>
          <Text style={styles.versionText}>{getAppVersionLabel()}</Text>
        </View>
      </ScrollView>
    </View>
  )
}

const useSettingsHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3, insets }) => {
  const c = md3.colors as any
  const styles = StyleSheet.create({
    root: {
      ...commonStyles.flex1,
      backgroundColor: c.background,
    },
    footerContainer: {
      marginBottom: insets.bottom + UI_SIZE_12,
    },
    scrollContainer: {
      flexGrow: 1,
    },
    scrollContent: {
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: insets.bottom + UI_SIZE_40,
    },
    group: {
      overflow: 'hidden',
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
    },
    groupSpaced: {
      overflow: 'hidden',
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      marginTop: UI_SIZE_24,
    },
    row: {
      overflow: 'hidden',
      ...commonStyles.row,
      padding: UI_SIZE_16,
    },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      marginLeft: UI_SIZE_16 + UI_SIZE_36 + UI_SIZE_16,
      marginRight: UI_SIZE_16,
      backgroundColor: hexWithAlpha(c.onSurface, 0.12),
    },
    iconWrap: {
      width: UI_SIZE_36,
      height: UI_SIZE_36,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
      ...commonStyles.centered,
    },
    rowContent: {
      ...commonStyles.flex1,
      marginLeft: UI_SIZE_16,
    },
    rowTitle: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
    },
    footerText: {
      textAlign: 'center',
      fontSize: FontSize.caption,
      fontStyle: 'italic',
      color: c.onSurfaceVariant,
      marginTop: UI_SIZE_20,
    },
    versionText: {
      textAlign: 'center',
      fontSize: FontSize.caption,
      color: c.onSurfaceVariant,
      marginTop: UI_SIZE_8,
    },
  })
  return styles
}, useSettingsHooks)
