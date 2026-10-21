import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import { Switch } from 'react-native-paper'
import { Easing, LinearTransition } from 'react-native-reanimated'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3CommonStyles } from '@/components/android/useMD3CommonStyles'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { MotionView } from '@/components/MotionView'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_22,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_18,
  UI_SIZE_20,
  UI_SIZE_28,
  UI_SIZE_44,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import { getLockMethodLabelKey } from '@/utils/settingsUtils'

import { usePrivacyLock } from './usePrivacyLock'

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
  const md3Styles = useMD3CommonStyles()
  const {
    lockAvailable,
    deviceMethod,
    isPassword,
    outdatedDevices,
    biometricAvailable,
    biometricOn,
    biometricBusy,
    screenshotProtection,
    switcherHide,
    setOrChangePassword,
    toggleBiometric,
    toggleScreenshotProtection,
    toggleSwitcherHide,
  } = usePrivacyLock()

  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])

  const methodName = t(getLockMethodLabelKey(deviceMethod))

  const handleSetPassword = useCallback(() => {
    setOrChangePassword(t('settings.privacy.changeMethodReason'))
  }, [setOrChangePassword, t])

  const handleToggleBiometric = useCallback(() => {
    toggleBiometric(t('settings.privacy.biometricReason', { method: methodName }))
  }, [toggleBiometric, methodName, t])

  const methodDesc = isPassword
    ? t('settings.privacy.noteLockPasswordDesc')
    : lockAvailable
      ? t('settings.privacy.noteLockDesc', { method: methodName })
      : t('settings.privacy.noteLockUnavailableDesc')

  return (
    <>
      <View>
        <Text style={md3Styles.settingsSectionCamelCase}>{t('settings.privacy.header')}</Text>
      </View>

      <MotionView
        layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
        style={styles.infoCard}
      >
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="lock-outline" size={UI_ICON_SIZE_22} color={c.primary} />
        </View>
        <View style={commonStyles.flex1}>
          <Text style={styles.rowSubtitle}>{methodDesc}</Text>
        </View>
      </MotionView>

      <MotionView
        layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
        style={styles.groupCard}
      >
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.rowTitle}>{t('settings.privacy.lockPassword')}</Text>
            <Text style={styles.rowSubtitle}>{t('settings.privacy.attachmentsNotEncrypted')}</Text>
          </View>
          <Pressable onPress={handleSetPassword} android_ripple={ripple} style={styles.actionBtn}>
            <Text style={styles.actionText}>
              {isPassword
                ? t('settings.privacy.lockPasswordChange')
                : t('settings.privacy.lockPasswordSet')}
            </Text>
          </Pressable>
        </View>

        {biometricAvailable && (
          <>
            <View style={styles.separator} />
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.rowTitle}>
                  {t('settings.privacy.biometricUnlock', { method: methodName })}
                </Text>
                <Text style={styles.rowSubtitle}>{t('settings.privacy.biometricUnlockDesc')}</Text>
              </View>
              <Switch
                value={biometricOn}
                disabled={biometricBusy}
                onValueChange={handleToggleBiometric}
              />
            </View>
          </>
        )}

        {outdatedDevices.length > 0 && (
          <>
            <View style={styles.separator} />
            <View style={styles.methodRow}>
              <Text style={styles.rowTitle}>{t('settings.privacy.outdatedDevices')}</Text>
              <Text style={styles.rowSubtitle}>
                {t('settings.privacy.outdatedDevicesDesc', {
                  devices: outdatedDevices.map((device) => device.title || '?').join(', '),
                })}
              </Text>
            </View>
          </>
        )}

        <View style={styles.separator} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.rowTitle}>{t('settings.privacy.blockScreenshots')}</Text>
            <Text style={styles.rowSubtitle}>{t('settings.privacy.blockScreenshotsDesc')}</Text>
          </View>
          <Switch value={screenshotProtection} onValueChange={toggleScreenshotProtection} />
        </View>

        <View style={styles.separator} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.rowTitle}>{t('settings.privacy.hideInSwitcher')}</Text>
            <Text style={styles.rowSubtitle}>{t('settings.privacy.hideInSwitcherDesc')}</Text>
          </View>
          <Switch value={switcherHide} onValueChange={toggleSwitcherHide} />
        </View>
      </MotionView>
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
    infoCard: {
      ...commonStyles.row,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      padding: UI_SIZE_16,
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
    methodRow: {
      paddingHorizontal: UI_SIZE_20,
      paddingVertical: UI_SIZE_18,
    },
    actionBtn: {
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_8,
      borderRadius: UI_SIZE_9999,
      overflow: 'hidden',
    },
    actionText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.primary,
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
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
      marginBottom: UI_SIZE_4,
    },
    rowSubtitle: {
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
      lineHeight: UI_SIZE_20,
    },
  })
  return styles
}, usePrivacyLockHooks)
