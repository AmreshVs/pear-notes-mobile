import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppState, PermissionsAndroid, Pressable, StyleSheet, View } from 'react-native'
import { Easing, FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated'

import { useMD3CommonStyles } from '@/components/android/useMD3CommonStyles'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { MotionView } from '@/components/MotionView'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_SIZE_4,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_28,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { BackgroundSyncMode } from '@/lib/backgroundSync'
import { hexWithAlpha } from '@/lib/backupUtils'

import {
  isIgnoringBatteryOptimizations,
  openBatteryOptimizationSettings,
} from '../../../modules/expo-background-service/src'

import { BACKGROUND_SYNC_MODE_LOCALE_KEY, useBackgroundSync } from './useBackgroundSync'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  primaryContainer?: string
  onPrimaryContainer?: string
  onSurfaceVariant?: string
}

const MODES: BackgroundSyncMode[] = ['off', 'periodic', 'always-on']

export function BackgroundSyncSection() {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3Styles = useMD3CommonStyles()
  const { mode, hasLinkedDevices, commitMode } = useBackgroundSync()
  const [batteryUnrestricted, setBatteryUnrestricted] = useState(true)

  useEffect(() => {
    const check = () => setBatteryUnrestricted(isIgnoringBatteryOptimizations())
    check()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check()
    })
    return () => subscription.remove()
  }, [])

  const handleOpenBatterySettings = useCallback(() => openBatteryOptimizationSettings(), [])

  const handleSelect = useCallback(
    async (next: BackgroundSyncMode) => {
      if (next === mode || !hasLinkedDevices) return

      if (next === 'always-on') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: t('sync.backgroundSync.permissionTitle'),
              message: t('sync.backgroundSync.permissionDescription'),
              buttonNeutral: t('backup.notificationPermissionAskMeLater'),
              buttonNegative: t('backup.notificationPermissionCancel'),
              buttonPositive: t('backup.notificationPermissionOK'),
            },
          )
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            commitMode(next)
          }
        } catch (err) {
          console.warn(err)
        }
        return
      }

      commitMode(next)
    },
    [mode, hasLinkedDevices, t, commitMode],
  )

  const renderSegment = useCallback(
    (item: BackgroundSyncMode) => {
      const active = item === mode
      return (
        <Pressable
          key={item}
          onPress={() => handleSelect(item)}
          disabled={!hasLinkedDevices}
          style={[styles.segItem, active && styles.segItemActive]}
        >
          <Text style={[styles.segText, active && styles.segTextActive]}>
            {t(`sync.backgroundSync.${BACKGROUND_SYNC_MODE_LOCALE_KEY[item]}`)}
          </Text>
        </Pressable>
      )
    },
    [mode, handleSelect, hasLinkedDevices, styles, t],
  )

  return (
    <>
      <MotionView entering={FadeIn.duration(220).delay(120)}>
        <Text style={[md3Styles.settingsSectionCamelCase, commonStyles.sectionHeader]}>
          {t('sync.backgroundSync.header')}
        </Text>
      </MotionView>

      <MotionView
        entering={FadeInDown.duration(240).delay(140)}
        layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
        style={styles.card}
      >
        <Text style={[styles.cardTitle, !hasLinkedDevices && commonStyles.disabled]}>
          {hasLinkedDevices
            ? t('sync.backgroundSync.modeLabel')
            : t('sync.backgroundSync.unlinkedTitle')}
        </Text>
        <View style={[styles.segContainer, !hasLinkedDevices && commonStyles.disabled]}>
          {MODES.map(renderSegment)}
        </View>
        <Text style={styles.cardDesc}>
          {hasLinkedDevices
            ? t(`sync.backgroundSync.${BACKGROUND_SYNC_MODE_LOCALE_KEY[mode]}Desc`)
            : t('sync.backgroundSync.unlinkedDesc')}
        </Text>

        {hasLinkedDevices && mode !== 'off' && !batteryUnrestricted && (
          <View style={styles.batteryNotice}>
            <Text style={styles.batteryTitle}>{t('sync.backgroundSync.batteryTitle')}</Text>
            <Text style={styles.batteryDesc}>{t('sync.backgroundSync.batteryDesc')}</Text>
            <Pressable onPress={handleOpenBatterySettings} style={styles.batteryBtn}>
              <Text style={styles.batteryBtnText}>{t('sync.backgroundSync.batteryAction')}</Text>
            </Pressable>
          </View>
        )}
      </MotionView>
    </>
  )
}

const useBackgroundSyncHooks = () => {
  const md3 = useMD3Theme()
  return { md3 }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3 }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    card: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      padding: Space.base,
      marginBottom: UI_SIZE_12,
    },
    cardTitle: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.medium,
      fontFamily: FontFamily.medium,
      color: c.onSurface,
      marginBottom: UI_SIZE_20,
    },
    cardDesc: {
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
      fontFamily: FontFamily.medium,
      fontWeight: FontWeight.medium,
      marginTop: UI_SIZE_16,
    },
    segContainer: {
      ...commonStyles.row,
      backgroundColor: hexWithAlpha(c.onSurface, 0.04),
      borderRadius: UI_SIZE_9999,
      padding: UI_SIZE_4,
    },
    batteryNotice: {
      marginTop: UI_SIZE_16,
      padding: UI_SIZE_16,
      borderRadius: UI_SIZE_20,
      gap: UI_SIZE_4,
      backgroundColor: hexWithAlpha(c.primary, 0.12),
    },
    batteryTitle: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
    },
    batteryDesc: {
      fontSize: FontSize.caption,
      color: c.onSurfaceVariant ?? c.onSurface,
      lineHeight: FontSize.caption * 1.45,
    },
    batteryBtn: {
      marginTop: UI_SIZE_4,
      alignSelf: 'flex-start',
      paddingVertical: UI_SIZE_4,
      paddingHorizontal: UI_SIZE_12,
      borderRadius: UI_SIZE_20,
      backgroundColor: c.primaryContainer ?? c.primary,
    },
    batteryBtnText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.bold,
      color: c.onPrimaryContainer ?? c.onSurface,
    },
    segItem: {
      ...commonStyles.flex1,
      paddingVertical: UI_SIZE_12,
      borderRadius: UI_SIZE_9999,
      borderColor: 'transparent',
      ...commonStyles.centered,
    },
    segItemActive: {
      backgroundColor: c.primaryContainer,
      borderColor: c.primary,
    },
    segText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurfaceVariant,
    },
    segTextActive: {
      color: c.onPrimaryContainer,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
    },
  })
  return styles
}, useBackgroundSyncHooks)
