import { Fingerprint, Lock, ScanFace, ShieldAlert } from 'lucide-react-native'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, StyleSheet, View as RNView } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'

import { GlassView } from '@/components/GlassView'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import { useLockedNoteView } from '@/components/useLockedNoteView'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  LetterSpacing,
  Radii,
  Space,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_40,
} from '@/constants/commonStyles'

export const LockedNoteView = memo(function LockedNoteView({ noteId }: { noteId: string }) {
  const { t } = useTranslation()
  const styles = useStyles()
  const { colors, isDark } = useTheme()
  const { authState, biometric, unlocking, isPassword, unavailable, handleUnlock } =
    useLockedNoteView(noteId)

  const onUnlock = useCallback(() => {
    handleUnlock(t('noteCard.unlockReason'))
  }, [handleUnlock, t])

  const iconColor = unavailable ? colors.error : colors.primary
  const btnTextColor = isDark ? colors.black : colors.white

  const renderIcon = () => {
    if (unavailable) return <ShieldAlert size={UI_ICON_SIZE_40} color={iconColor} strokeWidth={2} />
    if (biometric === 'face')
      return <ScanFace size={UI_ICON_SIZE_40} color={iconColor} strokeWidth={2} />
    if (biometric === 'fingerprint')
      return <Fingerprint size={UI_ICON_SIZE_40} color={iconColor} strokeWidth={2} />
    return <Lock size={UI_ICON_SIZE_40} color={iconColor} strokeWidth={2} />
  }

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

  const content = (
    <>
      <RNView style={[styles.iconRing, unavailable && styles.iconRingWarn]}>{renderIcon()}</RNView>
      <Text style={styles.title}>{t('noteCard.lockedTitle')}</Text>
      <Text style={styles.desc}>{description}</Text>
      {authState === 'supported' ? (
        <Pressable
          onPress={onUnlock}
          disabled={unlocking}
          style={({ pressed }) => [
            styles.unlockBtn,
            (pressed || unlocking) && styles.unlockBtnPressed,
          ]}
        >
          {unlocking ? (
            <ActivityIndicator size="small" color={btnTextColor} />
          ) : (
            <>
              <Lock size={UI_ICON_SIZE_20} color={btnTextColor} strokeWidth={2.5} />
              <Text style={styles.unlockBtnText}>{unlockLabel}</Text>
            </>
          )}
        </Pressable>
      ) : null}
    </>
  )

  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.container}>
      <Animated.View entering={FadeInDown.duration(260)} style={styles.card}>
        <GlassView intensity={50} style={styles.glass}>
          <RNView style={styles.inner}>{content}</RNView>
        </GlassView>
      </Animated.View>
    </Animated.View>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      ...commonStyles.centered,
      paddingHorizontal: Space.xl,
      backgroundColor: theme.colors.background,
    },
    card: {
      width: '100%',
      maxWidth: 400,
    },
    glass: {
      borderRadius: Radii.card,
    },
    inner: {
      padding: Space.xxxl,
      alignItems: 'center',
      width: '100%',
      backgroundColor: theme.colors.transparent,
    },
    iconRing: {
      ...commonStyles.iconRing80,
      backgroundColor: `${theme.colors.primary}26`,
      borderColor: `${theme.colors.primary}4D`,
      marginBottom: Space.lg,
    },
    iconRingWarn: {
      backgroundColor: `${theme.colors.error}26`,
      borderColor: `${theme.colors.error}4D`,
    },
    title: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: Space.sm,
      letterSpacing: LetterSpacing.tight,
    },
    desc: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
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
      borderRadius: Radii.md,
      backgroundColor: theme.colors.primary,
      marginTop: Space.xl,
    },
    unlockBtnPressed: {
      opacity: 0.85,
    },
    unlockBtnText: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.semiBold,
      color: theme.isDark ? theme.colors.black : theme.colors.white,
    },
  })
  return styles
})
