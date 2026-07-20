import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PermissionsAndroid, Pressable, StyleSheet, View } from 'react-native'
import Animated, { Easing, FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated'

import { useMD3CommonStyles } from '@/components/android/useMD3CommonStyles'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_SIZE_4,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_28,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import {
  BackgroundSyncMode,
  getBackgroundSyncMode,
  setBackgroundSyncMode,
} from '@/lib/backgroundSync'
import { applyBackgroundSyncMode } from '@/lib/backgroundSyncTask'
import { hexWithAlpha } from '@/lib/backupUtils'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  primaryContainer?: string
  onPrimaryContainer?: string
  onSurfaceVariant?: string
}

const MODES: BackgroundSyncMode[] = ['off', 'periodic', 'always-on']

const MODE_LOCALE_KEY: Record<BackgroundSyncMode, string> = {
  off: 'off',
  periodic: 'periodic',
  'always-on': 'alwaysOn',
}

export function BackgroundSyncSection() {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3Styles = useMD3CommonStyles()
  const [mode, setMode] = useState<BackgroundSyncMode>('off')

  useEffect(() => {
    let active = true
    getBackgroundSyncMode().then((value) => {
      if (active) setMode(value)
    })
    return () => {
      active = false
    }
  }, [])

  const commitMode = useCallback((next: BackgroundSyncMode) => {
    setMode(next)
    setBackgroundSyncMode(next)
    applyBackgroundSyncMode(next)
  }, [])

  const handleSelect = useCallback(
    async (next: BackgroundSyncMode) => {
      if (next === mode) return

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
    [mode, t, commitMode],
  )

  const renderSegment = useCallback(
    (item: BackgroundSyncMode) => {
      const active = item === mode
      return (
        <Pressable
          key={item}
          onPress={() => handleSelect(item)}
          style={[styles.segItem, active && styles.segItemActive]}
        >
          <Text style={[styles.segText, active && styles.segTextActive]}>
            {t(`sync.backgroundSync.${MODE_LOCALE_KEY[item]}`)}
          </Text>
        </Pressable>
      )
    },
    [mode, handleSelect, styles, t],
  )

  return (
    <>
      <Animated.View entering={FadeIn.duration(220).delay(120)}>
        <Text style={md3Styles.settingsSectionCapSpaced}>{t('sync.backgroundSync.header')}</Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(240).delay(140)}
        layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
        style={styles.card}
      >
        <Text style={styles.cardTitle}>{t('sync.backgroundSync.modeLabel')}</Text>
        <View style={styles.segContainer}>{MODES.map(renderSegment)}</View>
        <Text style={styles.cardDesc}>{t(`sync.backgroundSync.${MODE_LOCALE_KEY[mode]}Desc`)}</Text>
      </Animated.View>
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
      paddingHorizontal: UI_SIZE_20,
      paddingVertical: UI_SIZE_16,
      marginBottom: UI_SIZE_12,
    },
    cardTitle: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
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
    segItem: {
      ...commonStyles.flex1,
      paddingVertical: UI_SIZE_12,
      borderRadius: UI_SIZE_9999,
      ...commonStyles.centered,
    },
    segItemActive: {
      backgroundColor: c.primaryContainer,
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
