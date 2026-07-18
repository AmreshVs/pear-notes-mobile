import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import { useLockedNoteView } from '@/components/useLockedNoteView'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_40,
  UI_SIZE_9999,
  UI_SIZE_28,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  primaryContainer?: string
  onSurfaceVariant?: string
  onPrimary?: string
}

export const LockedNoteView = memo(function LockedNoteView({ noteId }: { noteId: string }) {
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const { authState, biometric, unlocking, isPassword, unavailable, handleUnlock } =
    useLockedNoteView(noteId)

  const onUnlock = useCallback(() => {
    handleUnlock(t('noteCard.unlockReason'))
  }, [handleUnlock, t])

  const iconColor = unavailable ? c.error : c.primary
  const iconName = unavailable
    ? 'shield-alert'
    : biometric === 'face'
      ? 'face-recognition'
      : biometric === 'fingerprint'
        ? 'fingerprint'
        : 'lock'

  const description = isPassword
    ? t('noteCard.lockedUnlockPasswordDesc')
    : unavailable
      ? t('noteCard.lockedNoAuthDesc')
      : biometric === 'face'
        ? t('noteCard.lockedUnlockFaceDesc')
        : biometric === 'fingerprint'
          ? t('noteCard.lockedUnlockFingerprintDesc')
          : t('noteCard.lockedUnlockDesc')

  const unlockLabel = isPassword
    ? t('noteCard.unlockWithPassword')
    : biometric === 'face'
      ? t('noteCard.unlockWithFace')
      : biometric === 'fingerprint'
        ? t('noteCard.unlockWithFingerprint')
        : t('noteCard.unlock')

  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.container}>
      <Animated.View entering={FadeInDown.duration(260)} style={styles.card}>
        <View style={[styles.iconChip, unavailable && styles.iconChipWarn]}>
          <MaterialCommunityIcons name={iconName} size={UI_ICON_SIZE_40} color={iconColor} />
        </View>
        <Text style={styles.title}>{t('noteCard.lockedTitle')}</Text>
        <Text style={styles.desc}>{description}</Text>
        {authState === 'supported' ? (
          <Pressable
            onPress={onUnlock}
            disabled={unlocking}
            style={({ pressed }) => [
              styles.unlockBtn,
              (pressed || unlocking) && commonStyles.pressed,
            ]}
          >
            {unlocking ? (
              <ActivityIndicator size="small" color={c.onPrimary} />
            ) : (
              <>
                <MaterialCommunityIcons name="lock" size={UI_ICON_SIZE_20} color={c.onPrimary} />
                <Text style={styles.unlockBtnText}>{unlockLabel}</Text>
              </>
            )}
          </Pressable>
        ) : null}
      </Animated.View>
    </Animated.View>
  )
})

const useMD3 = () => ({ md3: useMD3Theme() })

const useStyles = createThemedStylesheetWithHooks((_theme, { md3 }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      ...commonStyles.centered,
      paddingHorizontal: Space.xl,
      backgroundColor: c.background,
    },
    card: {
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
      padding: Space.xxl,
      borderRadius: UI_SIZE_28,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
    },
    iconChip: {
      width: 80,
      height: 80,
      borderRadius: UI_SIZE_9999,
      ...commonStyles.centered,
      marginBottom: Space.lg,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
    },
    iconChipWarn: {
      backgroundColor: hexWithAlpha(c.error, 0.15),
    },
    title: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
      textAlign: 'center',
      marginBottom: Space.sm,
    },
    desc: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: FontSize.body * 1.5,
      maxWidth: 300,
    },
    unlockBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Space.sm,
      height: 52,
      minWidth: 200,
      paddingHorizontal: Space.xl,
      borderRadius: UI_SIZE_9999,
      backgroundColor: c.primary,
      marginTop: Space.xl,
    },
    unlockBtnText: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.medium,
      fontFamily: FontFamily.semiBold,
      color: c.onPrimary,
    },
  })
  return styles
}, useMD3)
