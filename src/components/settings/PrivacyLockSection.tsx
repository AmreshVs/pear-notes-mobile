import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, Switch, View as RNView } from 'react-native'
import { Easing, LinearTransition } from 'react-native-reanimated'

import { MotionView } from '@/components/MotionView'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_20,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { getLockMethodLabelKey } from '@/utils/settingsUtils'

import { OutdatedDevicesRow } from './OutdatedDevicesRow'
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
    outdatedDevices,
    outdatedNames,
    biometricAvailable,
    biometricBlocked,
    biometricOn,
    biometricBusy,
    screenshotProtection,
    switcherHide,
    setOrChangePassword,
    toggleBiometric,
    toggleScreenshotProtection,
    toggleSwitcherHide,
  } = usePrivacyLock()

  const methodName = t(getLockMethodLabelKey(deviceMethod))

  const handleSetPassword = useCallback(() => {
    setOrChangePassword(t('settings.privacy.changeMethodReason'))
  }, [setOrChangePassword, t])

  const handleToggleBiometric = useCallback(() => {
    toggleBiometric(t('noteLockPassword.biometricEnableDesc', { method: methodName }))
  }, [toggleBiometric, methodName, t])

  const biometricDesc = biometricBlocked
    ? t('settings.privacy.biometricUnlockOutdated', {
        devices: outdatedNames,
        count: outdatedDevices.length,
      })
    : t('settings.privacy.biometricUnlockDesc')

  const methodDesc = isPassword
    ? t('settings.privacy.noteLockPasswordDesc')
    : lockAvailable
      ? t('settings.privacy.noteLockDesc', { method: methodName })
      : t('settings.privacy.noteLockUnavailableDesc')

  const trackColor = { false: colors.borderSecondary, true: colors.primary }

  return (
    <>
      <RNView>
        <Text style={commonThemedStyles.sectionCamelCase}>{t('settings.privacy.header')}</Text>
      </RNView>

      <MotionView layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}>
        <RNView style={styles.card}>
          <RNView style={styles.infoRow}>
            <RNView style={styles.iconBox}>
              <SymbolIcon name="lock.shield" size={UI_ICON_SIZE_20} color={colors.primary} />
            </RNView>
            <RNView style={commonStyles.flex1}>
              <Text style={styles.rowDesc}>{methodDesc}</Text>
            </RNView>
          </RNView>

          <RNView style={styles.divider} />

          <RNView style={styles.toggleRow}>
            <RNView style={styles.toggleInfo}>
              <Text style={styles.rowTitle}>{t('settings.privacy.lockPassword')}</Text>
              <Text style={styles.rowDesc}>{t('settings.privacy.attachmentsNotEncrypted')}</Text>
            </RNView>
            <Pressable
              onPress={handleSetPassword}
              style={({ pressed }) => [styles.actionBtn, pressed && commonStyles.pressed]}
            >
              <Text style={styles.actionText}>
                {isPassword
                  ? t('settings.privacy.lockPasswordChange')
                  : t('settings.privacy.lockPasswordSet')}
              </Text>
            </Pressable>
          </RNView>

          {biometricAvailable && (
            <>
              <RNView style={styles.divider} />
              <RNView style={styles.toggleRow}>
                <RNView style={styles.toggleInfo}>
                  <Text style={styles.rowTitle}>
                    {t('settings.privacy.biometricUnlock', { method: methodName })}
                  </Text>
                  <Text style={styles.rowDesc}>{biometricDesc}</Text>
                </RNView>
                <Switch
                  value={biometricOn && !biometricBlocked}
                  disabled={biometricBusy || biometricBlocked}
                  onValueChange={handleToggleBiometric}
                  trackColor={trackColor}
                  thumbColor={colors.white}
                />
              </RNView>
            </>
          )}

          {outdatedDevices.length > 0 && (
            <>
              <RNView style={styles.divider} />
              <OutdatedDevicesRow devices={outdatedDevices} />
            </>
          )}

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
    actionBtn: {
      paddingHorizontal: Space.md,
      paddingVertical: Space.sm,
      borderRadius: Radii.md,
      backgroundColor: theme.colors.controlBackground,
    },
    actionText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.primary,
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
      fontWeight: FontWeight.semibold,
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
