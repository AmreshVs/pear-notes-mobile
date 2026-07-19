import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, View as RNView, StyleSheet } from 'react-native'
import Animated, { Easing, FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated'

import { createThemedStylesheet, Text } from '@/components/Themed'
import {
  commonStyles,
  Durations,
  FontSize,
  FontWeight,
  Space,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_18,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import {
  BackgroundSyncMode,
  getBackgroundSyncMode,
  setBackgroundSyncMode,
} from '@/lib/backgroundSync'
import { applyBackgroundSyncMode } from '@/lib/backgroundSyncTask'

const MODES: BackgroundSyncMode[] = ['off', 'periodic']

const MODE_LOCALE_KEY: Record<BackgroundSyncMode, string> = {
  off: 'off',
  periodic: 'periodic',
  'always-on': 'alwaysOn',
}

export function BackgroundSyncSection() {
  const { t } = useTranslation()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
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

  const handleSelect = useCallback((next: BackgroundSyncMode) => {
    setMode(next)
    setBackgroundSyncMode(next)
    applyBackgroundSyncMode(next)
  }, [])

  const renderSegment = useCallback(
    (item: BackgroundSyncMode, i: number) => {
      const isActive = item === mode
      return (
        <Pressable
          key={item}
          onPress={() => handleSelect(item)}
          style={[
            styles.segPill,
            isActive && styles.segPillActive,
            i === 0 && styles.radiusLeft,
            i === MODES.length - 1 && styles.radiusRight,
          ]}
        >
          <Text style={[styles.segText, isActive && styles.segTextActive]}>
            {t(`sync.backgroundSync.${MODE_LOCALE_KEY[item]}`)}
          </Text>
        </Pressable>
      )
    },
    [mode, handleSelect, styles, t],
  )

  return (
    <>
      <Animated.View entering={FadeIn.duration(Durations.fade).delay(Durations.delayLong)}>
        <Text style={styles.sectionCapMargin}>{t('sync.backgroundSync.header')}</Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(Durations.slide).delay(Durations.delayLong)}
        layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
      >
        <RNView style={commonThemedStyles.card}>
          <RNView style={commonStyles.settingsRow}>
            <Text style={styles.rowLabel}>{t('sync.backgroundSync.modeLabel')}</Text>
            <RNView style={styles.segCtrl}>{MODES.map(renderSegment)}</RNView>
          </RNView>
          <RNView style={styles.descRow}>
            <Text style={styles.rowDesc}>
              {t(`sync.backgroundSync.${MODE_LOCALE_KEY[mode]}Desc`)}
            </Text>
          </RNView>
        </RNView>
      </Animated.View>
    </>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    sectionCapMargin: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      letterSpacing: 1.5,
      marginBottom: UI_SIZE_12,
      marginTop: UI_SIZE_16,
      textTransform: 'uppercase',
      color: theme.colors.textMuted,
    },
    rowLabel: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.medium,
      color: theme.colors.text,
    },
    descRow: {
      paddingHorizontal: UI_SIZE_18,
      paddingBottom: Space.base,
    },
    rowDesc: {
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
      lineHeight: FontSize.body * 1.4,
    },
    segCtrl: {
      ...commonStyles.row,
      borderRadius: UI_SIZE_16,
      padding: 3,
      backgroundColor: theme.colors.controlBackground,
    },
    segPill: {
      ...commonStyles.centered,
      paddingHorizontal: UI_SIZE_12,
      paddingVertical: 7,
      borderRadius: UI_SIZE_12,
    },
    segPillActive: {
      backgroundColor: theme.colors.primary,
    },
    radiusLeft: {
      borderTopLeftRadius: UI_SIZE_12,
      borderBottomLeftRadius: UI_SIZE_12,
    },
    radiusRight: {
      borderTopRightRadius: UI_SIZE_12,
      borderBottomRightRadius: UI_SIZE_12,
    },
    segText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.medium,
      color: theme.colors.textMuted,
    },
    segTextActive: {
      color: theme.colors.onPrimary,
      fontWeight: FontWeight.bold,
    },
  })
  return styles
})
