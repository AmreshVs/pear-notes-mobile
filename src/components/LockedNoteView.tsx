import { getLockMethod } from '@pear-notes/core/store/slices/settingsSlice.js'
import * as LocalAuthentication from 'expo-local-authentication'
import { Fingerprint, Lock, ScanFace, ShieldAlert } from 'lucide-react-native'
import { memo, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Platform, Pressable, StyleSheet, View as RNView } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { useSelector } from 'react-redux'

import { GlassView } from '@/components/GlassView'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
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
import { isDeviceAuthSupported } from '@/lib/deviceAuth'
import { markNoteUnlocked, unlockNote } from '@/lib/noteLock'
import { requestNoteLockPassword } from '@/lib/noteLockPasswordFlow'

const isAndroid = Platform.OS === 'android'

type AuthState = 'checking' | 'supported' | 'unavailable'
type BiometricKind = 'face' | 'fingerprint' | 'generic'

export const LockedNoteView = memo(function LockedNoteView({ noteId }: { noteId: string }) {
  const { t } = useTranslation()
  const styles = useStyles()
  const { colors, isDark } = useTheme()
  const [authState, setAuthState] = useState<AuthState>('checking')
  const [biometric, setBiometric] = useState<BiometricKind>('generic')
  const [unlocking, setUnlocking] = useState(false)
  const lockMethod = useSelector(getLockMethod)
  const isPassword = lockMethod === 'password'

  useEffect(() => {
    let active = true
    ;(async () => {
      if (isPassword) {
        if (active) setAuthState('supported')
        return
      }
      const supported = await isDeviceAuthSupported()
      if (!active) return
      if (!supported) {
        setAuthState('unavailable')
        return
      }
      setAuthState('supported')
      if (isAndroid) return
      try {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometric('face')
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometric('fingerprint')
        }
      } catch {
        setBiometric('generic')
      }
    })()
    return () => {
      active = false
    }
  }, [isPassword])

  const handleUnlock = useCallback(async () => {
    if (unlocking) return
    setUnlocking(true)
    try {
      if (isPassword) {
        const ok = await requestNoteLockPassword()
        if (ok) markNoteUnlocked(noteId)
      } else {
        await unlockNote(noteId, t('noteCard.unlockReason'))
      }
    } finally {
      setUnlocking(false)
    }
  }, [noteId, unlocking, isPassword, t])

  const unavailable = authState === 'unavailable'
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
          onPress={handleUnlock}
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
        {isAndroid ? (
          <RNView style={styles.androidCard}>{content}</RNView>
        ) : (
          <GlassView intensity={50} style={styles.glass}>
            <RNView style={styles.inner}>{content}</RNView>
          </GlassView>
        )}
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
    androidCard: {
      borderRadius: 28,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      padding: 32,
      alignItems: 'center',
      elevation: 2,
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
      fontWeight: isAndroid ? FontWeight.semibold : FontWeight.bold,
      fontFamily: isAndroid ? FontFamily.semiBold : FontFamily.bold,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: Space.sm,
      letterSpacing: isAndroid ? 0 : LetterSpacing.tight,
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
      borderRadius: isAndroid ? 9999 : Radii.md,
      backgroundColor: theme.colors.primary,
      marginTop: Space.xl,
    },
    unlockBtnPressed: {
      opacity: 0.85,
    },
    unlockBtnText: {
      fontSize: FontSize.subtitle,
      fontWeight: isAndroid ? FontWeight.medium : FontWeight.bold,
      fontFamily: FontFamily.semiBold,
      color: theme.isDark ? theme.colors.black : theme.colors.white,
    },
  })
  return styles
})
