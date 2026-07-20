import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View as RNView,
} from 'react-native'
import { BlurView } from 'expo-blur'
import { Eye, EyeOff, Lock } from 'lucide-react-native'

import { backendApi } from '@pear-notes/core/backend/api.js'

import { GlassView } from '@/components/GlassView'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  LetterSpacing,
  Radii,
  Space,
  UI_ICON_SIZE_18,
  UI_ICON_SIZE_40,
  UI_SIZE_8,
  UI_SIZE_54,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { hexWithAlpha } from '@/lib/backupUtils'
import {
  getNoteUnlockReason,
  resolveNoteLockPassword,
  useNoteUnlockVisible,
} from '@/lib/noteLockPasswordFlow'

export const NoteUnlockPasswordModal = memo(function NoteUnlockPasswordModal() {
  const { t } = useTranslation()
  const { colors, colorScheme } = useTheme()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const visible = useNoteUnlockVisible()

  const [password, setPassword] = useState('')
  const [secure, setSecure] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reason, setReason] = useState<string | undefined>()

  useEffect(() => {
    if (visible) {
      setPassword('')
      setSecure(true)
      setError('')
      setSubmitting(false)
      setReason(getNoteUnlockReason())
    }
  }, [visible])

  const toggleSecure = useCallback(() => setSecure((s) => !s), [])
  const handleCancel = useCallback(() => resolveNoteLockPassword(false), [])
  const handleChangePassword = useCallback((value: string) => {
    setPassword(value)
    setError('')
  }, [])

  const modalCardStyle = useMemo(
    () =>
      StyleSheet.flatten([
        commonStyles.modalCard,
        Platform.OS === 'android' && styles.androidModal,
      ]),
    [styles.androidModal],
  )

  const handleSubmit = useCallback(async () => {
    if (!password.trim() || submitting) return
    setSubmitting(true)
    const { valid, retryAfter } = await backendApi.verifyNoteLockPassword({ password })
    if (valid) {
      resolveNoteLockPassword(true)
    } else {
      setError(
        retryAfter > 0
          ? t('noteLockPassword.tooManyAttempts', { seconds: retryAfter })
          : t('noteLockPassword.incorrect'),
      )
      setSubmitting(false)
    }
  }, [password, submitting, t])

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <RNView style={styles.fill}>
        <BlurView intensity={95} tint={colorScheme} style={StyleSheet.absoluteFill} />
        <RNView style={commonStyles.modalOverlay} />
        <Pressable style={StyleSheet.absoluteFill} onPress={handleCancel} />

        <KeyboardAvoidingView style={styles.center} behavior="padding" pointerEvents="box-none">
          <GlassView intensity={40} borderRadius={32} style={modalCardStyle}>
            <RNView style={commonStyles.modalInner}>
              <RNView style={styles.icon}>
                <Lock size={UI_ICON_SIZE_40} color={colors.primary} />
              </RNView>

              <Text style={styles.title}>{t('noteLockPassword.enterTitle')}</Text>
              <Text style={styles.sub}>{reason || t('noteLockPassword.enterDesc')}</Text>

              <RNView style={styles.inputRow}>
                <TextInput
                  value={password}
                  onChangeText={handleChangePassword}
                  placeholder={t('noteLockPassword.placeholder')}
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={secure}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  onSubmitEditing={handleSubmit}
                  returnKeyType="go"
                  style={styles.input}
                />
                <Pressable onPress={toggleSecure} hitSlop={UI_SIZE_8} style={styles.eyeBtn}>
                  {secure ? (
                    <Eye size={UI_ICON_SIZE_18} color={colors.textMuted} />
                  ) : (
                    <EyeOff size={UI_ICON_SIZE_18} color={colors.textMuted} />
                  )}
                </Pressable>
              </RNView>

              {error.length > 0 && <Text style={styles.error}>{error}</Text>}

              <RNView style={styles.row}>
                <Pressable
                  onPress={handleCancel}
                  style={({ pressed }) => [
                    styles.btn,
                    commonThemedStyles.cancelBtn,
                    pressed && commonStyles.pressed,
                  ]}
                >
                  <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable
                  onPress={handleSubmit}
                  disabled={!password.trim() || submitting}
                  style={({ pressed }) => [
                    styles.btn,
                    styles.confirmBtn,
                    (!password.trim() || submitting) && styles.confirmBtnDisabled,
                    pressed && commonStyles.pressed,
                  ]}
                >
                  <Text style={styles.confirmText}>{t('noteLockPassword.unlockButton')}</Text>
                </Pressable>
              </RNView>
            </RNView>
          </GlassView>
        </KeyboardAvoidingView>
      </RNView>
    </Modal>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    fill: {
      ...StyleSheet.absoluteFill,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: Space.xl,
    },
    androidModal: {
      backgroundColor: theme.colors.background,
    },
    icon: {
      width: 80,
      height: 80,
      borderRadius: Space.xl,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      marginBottom: Space.sm,
      backgroundColor: hexWithAlpha(theme.colors.primary, 0.15),
      borderColor: hexWithAlpha(theme.colors.primary, 0.3),
    },
    title: {
      fontSize: FontSize.heading,
      fontWeight: FontWeight.bold,
      textAlign: 'center',
      letterSpacing: LetterSpacing.tight,
      marginBottom: Space.sm,
      marginTop: Space.xs,
      color: theme.colors.text,
    },
    sub: {
      fontSize: FontSize.body,
      textAlign: 'center',
      lineHeight: 22,
      opacity: 0.7,
      marginBottom: Space.lg,
      maxWidth: 280,
      color: theme.colors.text,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.controlBackground,
      borderRadius: Radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderSecondary,
      paddingHorizontal: Space.md,
      height: UI_SIZE_54,
      width: '100%',
    },
    input: {
      flex: 1,
      fontSize: FontSize.body,
      color: theme.colors.text,
    },
    eyeBtn: {
      paddingLeft: Space.sm,
    },
    error: {
      fontSize: FontSize.caption,
      color: theme.colors.error,
      marginTop: Space.sm,
      alignSelf: 'flex-start',
    },
    row: {
      flexDirection: 'row',
      gap: Space.md,
      width: '100%',
      marginTop: Space.lg,
    },
    btn: {
      flex: 1,
      height: 50,
      borderRadius: Radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelText: {
      color: theme.colors.textMuted,
      fontWeight: FontWeight.bold,
      fontSize: FontSize.body,
    },
    confirmBtn: {
      backgroundColor: theme.colors.primary,
    },
    confirmBtnDisabled: {
      opacity: 0.4,
    },
    confirmText: {
      color: theme.colors.onPrimary,
      fontWeight: FontWeight.bold,
      fontSize: FontSize.body,
    },
  })
  return styles
})
