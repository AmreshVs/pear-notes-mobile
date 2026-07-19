import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, Switch, View } from 'react-native'
import Animated, { Easing, FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated'

import { usePrivacyLock } from './usePrivacyLock'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_22,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_9999,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_18,
  UI_SIZE_20,
  UI_SIZE_28,
  UI_SIZE_44,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'
import { getLockMethodLabelKey } from '@/utils/settingsUtils'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  surfaceContainerHighest?: string
  primaryContainer?: string
  onPrimaryContainer?: string
  onSurfaceVariant?: string
  onPrimary?: string
}

export function PrivacyLockSection() {
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const {
    lockAvailable,
    deviceMethod,
    isPassword,
    passwordDisabled,
    screenshotProtection,
    switcherHide,
    selectBiometric,
    selectPassword,
    toggleScreenshotProtection,
    toggleSwitcherHide,
  } = usePrivacyLock()

  const disabledContentColor = hexWithAlpha(c.onSurface, 0.38)

  const handleSelectPassword = useCallback(() => {
    selectPassword(t('settings.privacy.changeMethodReason'))
  }, [selectPassword, t])

  const methodDesc = isPassword
    ? t('settings.privacy.noteLockPasswordDesc')
    : lockAvailable
      ? t('settings.privacy.noteLockDesc', { method: t(getLockMethodLabelKey(deviceMethod)) })
      : t('settings.privacy.noteLockUnavailableDesc')

  const trackColor = useMemo(
    () => ({ false: hexWithAlpha(c.onSurface, 0.15), true: c.primary }),
    [c.onSurface, c.primary],
  )

  return (
    <>
      <Animated.View entering={FadeIn.duration(220).delay(20)}>
        <Text style={styles.sectionCap}>{t('settings.privacy.header')}</Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(240).delay(40)}
        layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
        style={styles.infoCard}
      >
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="lock-outline" size={UI_ICON_SIZE_22} color={c.primary} />
        </View>
        <View style={commonStyles.flex1}>
          <Text style={styles.rowTitle}>{t('settings.privacy.noteLock')}</Text>
          <Text style={styles.rowSubtitle}>{methodDesc}</Text>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(240).delay(80)}
        layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
        style={styles.card}
      >
        <Text style={styles.cardTitle}>{t('settings.privacy.unlockMethod')}</Text>
        <View style={styles.segContainer}>
          <Pressable
            onPress={selectBiometric}
            disabled={!lockAvailable}
            style={[
              styles.segItem,
              !isPassword && styles.segItemActive,
              !lockAvailable && styles.segItemDisabled,
            ]}
          >
            <MaterialCommunityIcons
              name="fingerprint"
              size={UI_ICON_SIZE_20}
              color={
                !lockAvailable
                  ? disabledContentColor
                  : !isPassword
                    ? c.onPrimaryContainer
                    : c.onSurfaceVariant
              }
            />
            <Text
              style={[
                styles.segText,
                !isPassword && styles.segTextActive,
                !lockAvailable && styles.segTextDisabled,
              ]}
            >
              {t('settings.privacy.biometric')}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleSelectPassword}
            disabled={passwordDisabled}
            style={[
              styles.segItem,
              isPassword && styles.segItemActive,
              passwordDisabled && styles.segItemDisabled,
            ]}
          >
            <MaterialCommunityIcons
              name="key-outline"
              size={UI_ICON_SIZE_20}
              color={
                passwordDisabled
                  ? disabledContentColor
                  : isPassword
                    ? c.onPrimaryContainer
                    : c.onSurfaceVariant
              }
            />
            <Text
              style={[
                styles.segText,
                isPassword && styles.segTextActive,
                passwordDisabled && styles.segTextDisabled,
              ]}
            >
              {t('settings.privacy.password')}
            </Text>
          </Pressable>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(240).delay(120)}
        layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
        style={styles.groupCard}
      >
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.rowTitle}>{t('settings.privacy.blockScreenshots')}</Text>
            <Text style={styles.rowSubtitle}>{t('settings.privacy.blockScreenshotsDesc')}</Text>
          </View>
          <Switch
            value={screenshotProtection}
            onValueChange={toggleScreenshotProtection}
            trackColor={trackColor}
            thumbColor={c.onPrimary}
          />
        </View>

        <View style={styles.separator} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.rowTitle}>{t('settings.privacy.hideInSwitcher')}</Text>
            <Text style={styles.rowSubtitle}>{t('settings.privacy.hideInSwitcherDesc')}</Text>
          </View>
          <Switch
            value={switcherHide}
            onValueChange={toggleSwitcherHide}
            trackColor={trackColor}
            thumbColor={c.onPrimary}
          />
        </View>
      </Animated.View>
    </>
  )
}

const usePrivacyLockHooks = () => {
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
    infoCard: {
      ...commonStyles.row,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      paddingHorizontal: UI_SIZE_20,
      paddingVertical: UI_SIZE_18,
      marginBottom: UI_SIZE_12,
      gap: UI_SIZE_16,
    },
    iconWrap: {
      width: UI_SIZE_44,
      height: UI_SIZE_44,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
      ...commonStyles.centered,
    },
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
    segContainer: {
      ...commonStyles.row,
      backgroundColor: hexWithAlpha(c.onSurface, 0.04),
      borderRadius: UI_SIZE_9999,
      padding: UI_SIZE_4,
    },
    segItem: {
      ...commonStyles.flex1,
      flexDirection: 'row',
      paddingVertical: UI_SIZE_12,
      borderRadius: UI_SIZE_9999,
      ...commonStyles.centered,
      gap: UI_SIZE_8,
    },
    segItemActive: {
      backgroundColor: c.primaryContainer,
    },
    segItemDisabled: {
      backgroundColor: hexWithAlpha(c.onSurface, 0.12),
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
    segTextDisabled: {
      color: hexWithAlpha(c.onSurface, 0.38),
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
    toggleInfo: {
      ...commonStyles.flex1,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: hexWithAlpha(c.onSurface, 0.12),
      marginLeft: UI_SIZE_20,
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
}, usePrivacyLockHooks)
