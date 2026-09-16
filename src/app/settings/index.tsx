import { Fragment, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, View as RNView, View } from 'react-native'
import { Easing, LinearTransition } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSelector } from 'react-redux'
import { router, Stack } from 'expo-router'

import { LOCAL_AI_ENABLED } from '@pear-notes/core/store/services/localAiCatalog.js'
import { getHasLinkedDevices } from '@pear-notes/core/store/slices/syncedDevicesSlice.js'

import { Divider } from '@/components/Divider'
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
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_20,
  UI_SIZE_44,
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

  const handleOpenDebug = useCallback(() => {
    router.push('/settings/debug' as never)
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
      ...(LOCAL_AI_ENABLED
        ? [
            {
              key: 'onDeviceAi',
              icon: 'sparkles' as IconName,
              label: t('settings.onDeviceAi.rowTitle'),
              onPress: () => router.push('/settings/on-device-ai' as any),
            },
          ]
        : []),
      {
        key: 'devices',
        icon: 'laptopcomputer.and.iphone' as IconName,
        label: t('settings.devices.rowTitle'),
        onPress: () => router.push('/settings/devices' as any),
      },
      {
        key: 'sync',
        icon: 'arrow.clockwise' as IconName,
        label: t('settings.sync.rowTitle'),
        onPress: () => router.push('/settings/sync' as any),
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
    <RNView style={commonThemedStyles.modalContainer}>
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
          <MotionView layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}>
            <RNView style={commonThemedStyles.card}>
              {sections.map(({ key, icon, label, onPress }, i) => (
                <Fragment key={key}>
                  <Pressable
                    onPress={onPress}
                    style={({ pressed }) => [
                      commonStyles.settingsRow,
                      pressed && commonStyles.pressed,
                    ]}
                  >
                    <RNView style={commonStyles.settingsRowLeft}>
                      <RNView style={commonThemedStyles.iconBox34}>
                        <SymbolIcon name={icon} size={UI_SIZE_20} color={colors.primary} />
                      </RNView>
                      <Text style={styles.rowLabel}>{label}</Text>
                    </RNView>
                    <SymbolIcon
                      name="chevron.forward"
                      size={UI_ICON_SIZE_16}
                      color={colors.textMuted}
                    />
                  </Pressable>
                  {i < sections.length - 1 && (
                    <RNView style={styles.dividerWrap}>
                      <Divider />
                    </RNView>
                  )}
                </Fragment>
              ))}
            </RNView>
          </MotionView>
        </View>
        <View style={commonStyles.flex1} />
        <RNView style={styles.footerContainer}>
          <Text style={styles.footer}>{t('settings.footer')}</Text>
          <Pressable onLongPress={handleOpenDebug} delayLongPress={Durations.debugHold}>
            <Text style={styles.version}>{getAppVersionLabel()}</Text>
          </Pressable>
        </RNView>
      </ScrollView>
    </RNView>
  )
}

const useStyles = createThemedStylesheetWithHooks((theme, insets) => {
  const styles = StyleSheet.create({
    footerContainer: {
      marginTop: UI_SIZE_20,
      marginBottom: insets.bottom + UI_SIZE_12,
    },
    scrollContainer: {
      flexGrow: 1,
    },
    scroll: {
      paddingHorizontal: UI_SIZE_20,
      paddingTop: UI_SIZE_12,
    },
    dividerWrap: {
      marginHorizontal: 18,
    },
    rowLabel: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    footer: {
      textAlign: 'center',
      fontSize: FontSize.caption,
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
