import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StatusBar, StyleSheet, View } from 'react-native'
import Animated, { Easing, FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import Constants from 'expo-constants'
import { router, Stack } from 'expo-router'

import { useMD3Theme } from '@/components/android/useMD3Theme'
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
import { hexWithAlpha } from '@/lib/backupUtils'

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name']

export default function AndroidSettingsScreen() {
  const { t } = useTranslation()
  const styles = useStyles()
  const theme = useTheme()
  const md3 = useMD3Theme()
  const c = md3.colors

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
        key: 'sync',
        icon: 'sync',
        label: t('settings.sync.linkAndSync'),
        onPress: () => router.push('/settings/sync'),
      },
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
    [t],
  )

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={styles.root.backgroundColor}
      />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={UI_SIZE_12} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={UI_ICON_SIZE_24} color={c.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
      </View>

      <View style={styles.scrollContent}>
        {sections.map(({ key, icon, label, onPress }, i) => (
          <Animated.View
            key={key}
            entering={FadeInDown.duration(240).delay(40 + i * 40)}
            layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
          >
            <Pressable
              onPress={onPress}
              style={({ pressed }) => [styles.cardRow, pressed && styles.cardPressed]}
            >
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
          </Animated.View>
        ))}
      </View>
      <View style={commonStyles.flex1} />
      <Animated.View style={styles.footerContainer} entering={FadeIn.duration(220).delay(280)}>
        <Text style={styles.footerText}>{t('settings.footer')}</Text>
        <Text style={styles.versionText}>v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
      </Animated.View>
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
    scrollContent: {
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: insets.bottom + UI_SIZE_40,
      paddingTop: UI_SIZE_10,
    },
    cardRow: {
      ...commonStyles.row,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      paddingHorizontal: UI_SIZE_20,
      paddingVertical: UI_SIZE_18,
      marginBottom: UI_SIZE_12,
    },
    cardPressed: {
      backgroundColor: c.surfaceContainerHighest ?? c.surfaceVariant,
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
