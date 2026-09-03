import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, Switch, View as RNView } from 'react-native'
import { Easing, FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated'

import { MotionView } from '@/components/MotionView'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  Durations,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_20,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { getLockMethodLabelKey } from '@/utils/settingsUtils'

import { usePrivacyLock } from './usePrivacyLock'

export function PrivacyLockSection() {
  const { t } = useTranslation()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const { colors } = useTheme()
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

  const handleSelectPassword = useCallback(() => {
    selectPassword(t('settings.privacy.changeMethodReason'))
  }, [selectPassword, t])

  const methodDesc = isPassword
    ? t('settings.privacy.noteLockPasswordDesc')
    : lockAvailable
      ? t('settings.privacy.noteLockDesc', { method: t(getLockMethodLabelKey(deviceMethod)) })
      : t('settings.privacy.noteLockUnavailableDesc')

  const trackColor = { false: colors.borderSecondary, true: colors.primary }

  return (
    <>
      <MotionView entering={FadeIn.duration(Durations.fade).delay(Durations.delayFooter)}>
        <Text style={commonThemedStyles.sectionCamelCase}>{t('settings.privacy.header')}</Text>
      </MotionView>

      <MotionView
        entering={FadeInDown.duration(Durations.slide).delay(Durations.delayFooter)}
        layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
      >
        <RNView style={styles.card}>
          <RNView style={styles.infoRow}>
            <RNView style={styles.iconBox}>
              <SymbolIcon name="lock.shield" size={UI_ICON_SIZE_20} color={colors.primary} />
            </RNView>
            <RNView style={commonStyles.flex1}>
              <Text style={styles.rowTitle}>{t('settings.privacy.noteLock')}</Text>
              <Text style={styles.rowDesc}>{methodDesc}</Text>
            </RNView>
          </RNView>

          <RNView style={styles.divider} />

          <RNView style={styles.methodRow}>
            <Text style={styles.rowTitle}>{t('settings.privacy.unlockMethod')}</Text>
            <RNView style={styles.segment}>
              <Pressable
                onPress={selectBiometric}
                disabled={!lockAvailable}
                style={[
                  styles.segmentBtn,
                  !isPassword && styles.segmentBtnActive,
                  !lockAvailable && styles.segmentBtnDisabled,
                ]}
              >
                <SymbolIcon
                  name="touchid"
                  size={UI_ICON_SIZE_16}
                  color={!isPassword ? colors.onPrimary : colors.textMuted}
                  weight="medium"
                />
                <Text style={!isPassword ? styles.segmentTextActive : styles.segmentText}>
                  {t('settings.privacy.biometric')}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSelectPassword}
                disabled={passwordDisabled}
                style={[
                  styles.segmentBtn,
                  isPassword && styles.segmentBtnActive,
                  passwordDisabled && styles.segmentBtnDisabled,
                ]}
              >
                <SymbolIcon
                  name="key"
                  size={UI_ICON_SIZE_16}
                  color={isPassword ? colors.onPrimary : colors.textMuted}
                  weight="medium"
                />
                <Text style={isPassword ? styles.segmentTextActive : styles.segmentText}>
                  {t('settings.privacy.password')}
                </Text>
              </Pressable>
            </RNView>
          </RNView>

          <RNView style={styles.divider} />

          <RNView style={styles.toggleRow}>
            <RNView style={styles.toggleInfo}>
              <Text style={styles.rowTitle}>{t('settings.privacy.blockScreenshots')}</Text>
              <Text style={styles.rowDesc}>{t('settings.privacy.blockScreenshotsDesc')}</Text>
            </RNView>
            <Switch
              value={screenshotProtection}
              onValueChange={toggleScreenshotProtection}
              trackColor={trackColor}
              thumbColor={colors.white}
            />
          </RNView>

          <RNView style={styles.divider} />

          <RNView style={styles.toggleRow}>
            <RNView style={styles.toggleInfo}>
              <Text style={styles.rowTitle}>{t('settings.privacy.hideInSwitcher')}</Text>
              <Text style={styles.rowDesc}>{t('settings.privacy.hideInSwitcherDesc')}</Text>
            </RNView>
            <Switch
              value={switcherHide}
              onValueChange={toggleSwitcherHide}
              trackColor={trackColor}
              thumbColor={colors.white}
            />
          </RNView>
        </RNView>
      </MotionView>
    </>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    card: {
      backgroundColor: theme.colors.cardSurface,
      borderRadius: Radii.card,
      borderColor: theme.colors.borderSecondary,
      overflow: 'hidden',
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.md,
      padding: Space.lg,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: Radii.md,
      backgroundColor: theme.colors.cardSelected,
      ...commonStyles.centered,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginHorizontal: Space.base,
    },
    methodRow: {
      padding: Space.lg,
      gap: Space.md,
    },
    segment: {
      flexDirection: 'row',
      backgroundColor: theme.colors.controlBackground,
      borderRadius: Radii.md,
      padding: 4,
      gap: 4,
    },
    segmentBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Space.sm,
      height: 40,
      borderRadius: Radii.sm,
    },
    segmentBtnActive: {
      backgroundColor: theme.colors.primary,
    },
    segmentBtnDisabled: {
      opacity: 0.4,
    },
    segmentText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.textMuted,
    },
    segmentTextActive: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.onPrimary,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Space.md,
      padding: Space.lg,
    },
    toggleInfo: {
      flex: 1,
    },
    rowTitle: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.medium,
      color: theme.colors.text,
    },
    rowDesc: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
      marginTop: 2,
      lineHeight: FontSize.body * 1.4,
    },
  })
  return styles
})
