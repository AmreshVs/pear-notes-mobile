import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, StyleSheet, View as RNView } from 'react-native'
import { FadeIn, FadeInDown } from 'react-native-reanimated'

import { GlassView } from '@/components/GlassView'
import { MotionView } from '@/components/MotionView'
import { SymbolIcon } from '@/components/SymbolIcon'
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
  UI_SIZE_52,
  UI_SIZE_200,
} from '@/constants/commonStyles'

type Props = {
  noteId: string
  topInset?: number
}

export const LockedNoteView = memo(function LockedNoteView({ noteId, topInset = 0 }: Props) {
  const { t } = useTranslation()
  const styles = useStyles()
  const { colors } = useTheme()
  const { authState, biometric, unlocking, isPassword, unavailable, handleUnlock } =
    useLockedNoteView(noteId)

  const onUnlock = useCallback(() => {
    handleUnlock(t('noteCard.unlockReason'))
  }, [handleUnlock, t])

  const containerStyle = useMemo(
    () => [styles.container, { paddingTop: topInset }],
    [styles.container, topInset],
  )

  const iconColor = unavailable ? colors.error : colors.primary
  const btnTextColor = colors.onPrimary

  const renderIcon = () => {
    if (unavailable)
      return (
        <SymbolIcon
          name="exclamationmark.shield"
          size={UI_ICON_SIZE_40}
          color={iconColor}
          weight="medium"
        />
      )
    if (biometric === 'face')
      return <SymbolIcon name="faceid" size={UI_ICON_SIZE_40} color={iconColor} weight="medium" />
    if (biometric === 'fingerprint')
      return <SymbolIcon name="touchid" size={UI_ICON_SIZE_40} color={iconColor} weight="medium" />
    return <SymbolIcon name="lock" size={UI_ICON_SIZE_40} color={iconColor} weight="medium" />
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
              <SymbolIcon
                name="lock"
                size={UI_ICON_SIZE_20}
                color={btnTextColor}
                weight="semibold"
              />
              <Text style={styles.unlockBtnText}>{unlockLabel}</Text>
            </>
          )}
        </Pressable>
      ) : null}
    </>
  )

  return (
    <MotionView entering={FadeIn.duration(220)} style={containerStyle}>
      <MotionView entering={FadeInDown.duration(260)} style={styles.card}>
        <GlassView intensity={50} style={styles.glass}>
          <RNView style={styles.inner}>{content}</RNView>
        </GlassView>
      </MotionView>
    </MotionView>
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
      minHeight: UI_SIZE_52,
      minWidth: UI_SIZE_200,
      paddingVertical: Space.sm,
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
      color: theme.colors.onPrimary,
    },
  })
  return styles
})
