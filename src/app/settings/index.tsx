import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, View as RNView, View } from 'react-native'
import { Easing, FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSelector } from 'react-redux'
import { router, Stack } from 'expo-router'

import { getHasLinkedDevices } from '@pear-notes/core/store/slices/syncedDevicesSlice.js'

import { MotionView } from '@/components/MotionView'
import { type IconName, SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  Durations,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_17,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_20,
  UI_SIZE_40,
  UI_SIZE_44,
  UI_SIZE_60,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { getAppVersionLabel } from '@/lib/appVersion'

export default function SettingsScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { colors } = theme
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const hasLinkedDevices = useSelector(getHasLinkedDevices) as boolean

  const handleClose = useCallback(() => {
    router.back()
  }, [])

  const sections = useMemo(
    () => [
      {
        key: 'general',
        icon: 'slider.horizontal.3' as IconName,
        label: t('layouts.general'),
        onPress: () => router.push('/settings/general' as any),
      },
      {
        key: 'privacy',
        icon: 'checkmark.shield' as IconName,
        label: t('settings.privacy.rowTitle'),
        onPress: () => router.push('/settings/privacy' as any),
      },
      {
        key: 'sync',
        icon: 'arrow.clockwise' as IconName,
        label: t('settings.sync.linkAndSync'),
        onPress: () => router.push('/settings/sync'),
      },
      ...(hasLinkedDevices
        ? [
            {
              key: 'activity',
              icon: 'clock.arrow.circlepath' as IconName,
              label: t('layouts.activity'),
              onPress: () => router.push('/settings/activity' as any),
            },
          ]
        : []),
      {
        key: 'backup',
        icon: 'square.and.arrow.down' as IconName,
        label: t('settings.backup.backupAndRestore'),
        onPress: () => router.push('/settings/backup' as any),
      },
      {
        key: 'storage',
        icon: 'cylinder.split.1x2' as IconName,
        label: t('settings.storage.storageTitle'),
        onPress: () => router.push('/settings/storage' as any),
      },
    ],
    [t, hasLinkedDevices],
  )

  return (
    <RNView style={commonThemedStyles.screenContainer}>
      <Stack.Screen
        options={{
          title: t('settings.title'),
          headerRight: () => (
            <Pressable
              onPress={handleClose}
              hitSlop={UI_SIZE_8}
              accessibilityRole="button"
              accessibilityLabel={t('common.done')}
              style={({ pressed }) => [styles.closeBtn, pressed && commonStyles.pressed]}
            >
              <Text style={styles.closeLabel}>{t('common.done')}</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.scroll}>
          <MotionView
            entering={FadeInDown.duration(Durations.slide).delay(Durations.delayShort)}
            layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
          >
            <RNView style={commonThemedStyles.card}>
              {sections.map(({ key, icon, label, onPress }, i) => (
                <Pressable
                  key={key}
                  onPress={onPress}
                  style={({ pressed }) => [
                    i < sections.length - 1 ? styles.rowUnderline : commonStyles.settingsRow,
                    pressed && commonStyles.pressed,
                  ]}
                >
                  <RNView style={commonStyles.settingsRowLeft}>
                    <RNView style={commonThemedStyles.iconBox34}>
                      <SymbolIcon name={icon} size={UI_ICON_SIZE_17} color={colors.primary} />
                    </RNView>
                    <Text style={styles.rowLabel}>{label}</Text>
                  </RNView>
                  <SymbolIcon
                    name="chevron.forward"
                    size={UI_ICON_SIZE_16}
                    color={colors.textMuted}
                  />
                </Pressable>
              ))}
            </RNView>
          </MotionView>
        </View>
        <View style={commonStyles.flex1} />
        <MotionView
          style={styles.footerContainer}
          entering={FadeIn.duration(Durations.fade).delay(Durations.delayLong)}
        >
          <Text style={styles.footer}>{t('settings.footer')}</Text>
          <Text style={styles.version}>{getAppVersionLabel()}</Text>
        </MotionView>
      </ScrollView>
    </RNView>
  )
}

const useStyles = createThemedStylesheetWithHooks((theme, insets) => {
  const styles = StyleSheet.create({
    footerContainer: {
      marginBottom: insets.bottom + UI_SIZE_12,
    },
    scrollContainer: {
      flexGrow: 1,
    },
    scroll: {
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: UI_SIZE_60,
      paddingTop: UI_SIZE_12,
    },
    rowUnderline: {
      ...commonStyles.settingsRow,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSecondary,
    },
    rowLabel: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    footer: {
      textAlign: 'center',
      fontSize: FontSize.caption,
      marginTop: UI_SIZE_40,
      fontStyle: 'italic',
      color: theme.colors.textMuted,
    },
    version: {
      textAlign: 'center',
      fontSize: FontSize.caption,
      marginTop: UI_SIZE_8,
      color: theme.colors.textMuted,
    },
    closeBtn: {
      ...commonStyles.centered,
      minWidth: UI_SIZE_44,
      minHeight: UI_SIZE_44,
      paddingHorizontal: Space.sm,
    },
    closeLabel: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.primary,
    },
  })

  return styles
}, useSafeAreaInsets)
