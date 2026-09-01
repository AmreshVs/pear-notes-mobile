import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native'
import { Easing, FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSelector } from 'react-redux'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router, Stack } from 'expo-router'

import { getHasLinkedDevices } from '@pear-notes/core/store/slices/syncedDevicesSlice.js'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { MotionView } from '@/components/MotionView'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_22,
  UI_ICON_SIZE_24,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_18,
  UI_SIZE_20,
  UI_SIZE_28,
  UI_SIZE_40,
  UI_SIZE_44,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { getAppVersionLabel } from '@/lib/appVersion'
import { hexWithAlpha } from '@/lib/backupUtils'

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name']

export default function AndroidSettingsScreen() {
  const { t } = useTranslation()
  const styles = useStyles()
  const theme = useTheme()
  const md3 = useMD3Theme()
  const c = md3.colors

  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const rippleBorderless = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const hasLinkedDevices = useSelector(getHasLinkedDevices) as boolean

  const sections = useMemo<{ key: string; icon: IconName; label: string; onPress: () => void }[]>(
    () => [
      {
        key: 'general',
        icon: 'tune-variant',
        label: t('layouts.general'),
        onPress: () => router.push('/settings/general' as any),
      },
      {
        key: 'privacy',
        icon: 'shield-check-outline',
        label: t('settings.privacy.rowTitle'),
        onPress: () => router.push('/settings/privacy' as any),
      },
      {
        key: 'devices',
        icon: 'devices',
        label: t('settings.devices.rowTitle'),
        onPress: () => router.push('/settings/devices' as any),
      },
      {
        key: 'sync',
        icon: 'sync',
        label: t('settings.sync.rowTitle'),
        onPress: () => router.push('/settings/sync' as any),
      },
      ...(hasLinkedDevices
        ? [
            {
              key: 'activity',
              icon: 'history' as IconName,
              label: t('layouts.activity'),
              onPress: () => router.push('/settings/activity' as any),
            },
          ]
        : []),
      {
        key: 'backup',
        icon: 'cloud-download-outline',
        label: t('settings.backup.backupAndRestore'),
        onPress: () => router.push('/settings/backup' as any),
      },
      {
        key: 'storage',
        icon: 'database-outline',
        label: t('settings.storage.storageTitle'),
        onPress: () => router.push('/settings/storage' as any),
      },
    ],
    [t, hasLinkedDevices],
  )

  return (
    <View style={styles.root}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          android_ripple={rippleBorderless}
          hitSlop={UI_SIZE_12}
          style={styles.iconBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={UI_ICON_SIZE_24} color={c.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.scrollContent}>
          {sections.map(({ key, icon, label, onPress }, i) => (
            <MotionView
              key={key}
              entering={FadeInDown.duration(240).delay(40 + i * 40)}
              layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
            >
              <Pressable onPress={onPress} android_ripple={ripple} style={styles.cardRow}>
                <View style={styles.iconWrap}>
                  <MaterialCommunityIcons name={icon} size={UI_ICON_SIZE_22} color={c.primary} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>{label}</Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={UI_ICON_SIZE_20}
                  color={c.primary}
                />
              </Pressable>
            </MotionView>
          ))}
        </View>
        <View style={commonStyles.flex1} />
        <MotionView style={styles.footerContainer} entering={FadeIn.duration(220).delay(280)}>
          <Text style={styles.footerText}>{t('settings.footer')}</Text>
          <Text style={styles.versionText}>{getAppVersionLabel()}</Text>
        </MotionView>
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
    header: {
      ...commonStyles.row,
      paddingTop: insets.top + UI_SIZE_16,
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: UI_SIZE_16,
    },
    iconBtn: {
      width: UI_SIZE_40,
      height: UI_SIZE_40,
      ...commonStyles.centered,
    },
    headerTitle: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
      textAlign: 'left',
    },
    scrollContainer: {
      flexGrow: 1,
    },
    scrollContent: {
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: insets.bottom + UI_SIZE_40,
      paddingTop: UI_SIZE_10,
    },
    cardRow: {
      overflow: 'hidden',
      ...commonStyles.row,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      paddingHorizontal: UI_SIZE_20,
      paddingVertical: UI_SIZE_18,
      marginBottom: UI_SIZE_12,
    },
    iconWrap: {
      width: UI_SIZE_44,
      height: UI_SIZE_44,
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
