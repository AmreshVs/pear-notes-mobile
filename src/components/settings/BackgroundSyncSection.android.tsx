import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PermissionsAndroid, StyleSheet, Switch, View } from 'react-native'
import Animated, { Easing, FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_22,
  UI_SIZE_4,
  UI_SIZE_9999,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_18,
  UI_SIZE_20,
  UI_SIZE_28,
  UI_SIZE_44,
} from '@/constants/commonStyles'
import {
  BACKGROUND_SYNC_ENABLED_KEY,
  getBackgroundSyncPreference,
  setBackgroundSyncPreference,
} from '@/lib/backgroundSync'
import { hexWithAlpha } from '@/lib/backupUtils'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  primaryContainer?: string
  onPrimary?: string
}

export function BackgroundSyncSection() {
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    let active = true
    getBackgroundSyncPreference(BACKGROUND_SYNC_ENABLED_KEY).then((value) => {
      if (active) setEnabled(value)
    })
    return () => {
      active = false
    }
  }, [])

  const trackColor = useMemo(
    () => ({ false: hexWithAlpha(c.onSurface, 0.15), true: c.primary }),
    [c.onSurface, c.primary],
  )

  const handleToggle = useCallback(async () => {
    if (enabled) {
      setEnabled(false)
      setBackgroundSyncPreference(BACKGROUND_SYNC_ENABLED_KEY, false)
      return
    }

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
        setEnabled(true)
        setBackgroundSyncPreference(BACKGROUND_SYNC_ENABLED_KEY, true)
      }
    } catch (err) {
      console.warn(err)
    }
  }, [enabled, t])

  return (
    <>
      <Animated.View entering={FadeIn.duration(220).delay(20)}>
        <Text style={styles.sectionCap}>{t('sync.backgroundSync.header')}</Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(240).delay(40)}
        layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
        style={styles.groupCard}
      >
        <View style={styles.toggleRow}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="sync" size={UI_ICON_SIZE_22} color={c.primary} />
          </View>
          <View style={commonStyles.flex1}>
            <Text style={styles.rowTitle}>{t('sync.backgroundSync.title')}</Text>
            <Text style={styles.rowSubtitle}>{t('sync.backgroundSync.description')}</Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={handleToggle}
            trackColor={trackColor}
            thumbColor={c.onPrimary}
          />
        </View>
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
    sectionCap: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.heavy,
      fontFamily: FontFamily.bold,
      letterSpacing: 1.2,
      color: c.primary,
      marginBottom: UI_SIZE_16,
    },
    groupCard: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      marginBottom: UI_SIZE_12,
      overflow: 'hidden',
    },
    toggleRow: {
      ...commonStyles.row,
      paddingHorizontal: UI_SIZE_20,
      paddingVertical: UI_SIZE_18,
      gap: UI_SIZE_16,
    },
    iconWrap: {
      width: UI_SIZE_44,
      height: UI_SIZE_44,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
      ...commonStyles.centered,
    },
    rowTitle: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
      marginBottom: UI_SIZE_4,
    },
    rowSubtitle: {
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
      fontFamily: FontFamily.medium,
      fontWeight: FontWeight.medium,
      lineHeight: UI_SIZE_20,
    },
  })
  return styles
}, useBackgroundSyncHooks)
