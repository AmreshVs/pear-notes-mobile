import { Key } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, View as RNView, StyleSheet, TextInput } from 'react-native'

import { GlassView } from '@/components/GlassView'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  MonoFontFamily,
  Radii,
  Space,
  UI_ICON_SIZE_28,
  UI_SIZE_54,
} from '@/constants/commonStyles'
import { isValidRecoveryKey } from '@/lib/backupUtils'

type RecoveryKeyModalProps = {
  visible: boolean
  onClose: () => void
  onSubmit: (key: string) => void
}

export function RecoveryKeyModal({ visible, onClose, onSubmit }: RecoveryKeyModalProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const { colors } = theme
  const styles = useStyles()
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState(false)

  const handleChange = useCallback((value: string) => {
    setInputValue(value)
    setError(false)
  }, [])

  const handleClose = useCallback(() => {
    setInputValue('')
    setError(false)
    onClose()
  }, [onClose])

  const handleSubmit = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!isValidRecoveryKey(trimmed)) {
      setError(true)
      return
    }
    onSubmit(trimmed)
    setInputValue('')
    setError(false)
  }, [inputValue, onSubmit])

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <RNView style={styles.overlay}>
        <RNView style={styles.card}>
          <GlassView intensity={50} style={styles.glass}>
            <RNView style={styles.inner}>
              <RNView style={styles.iconRing}>
                <Key size={UI_ICON_SIZE_28} color={colors.primary} strokeWidth={2} />
              </RNView>

              <Text style={styles.title}>{t('backup.enterRecoveryKeyTitle')}</Text>
              <Text style={styles.desc}>{t('backup.enterRecoveryKeyDesc')}</Text>

              <TextInput
                style={[styles.input, error && styles.inputError]}
                value={inputValue}
                onChangeText={handleChange}
                onSubmitEditing={handleSubmit}
                placeholder="0123456789abcdef..."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={64}
              />

              {error ? <Text style={styles.errorText}>{t('backup.invalidKeyDesc')}</Text> : null}

              <RNView style={styles.actionRow}>
                <Pressable
                  onPress={handleClose}
                  style={({ pressed }) => [styles.cancelBtn, pressed && commonStyles.pressed]}
                >
                  <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable
                  onPress={handleSubmit}
                  disabled={!inputValue.trim()}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    pressed && commonStyles.pressed,
                    !inputValue.trim() && styles.disabledBtn,
                  ]}
                >
                  <Text style={styles.submitBtnText}>{t('common.ok') || 'OK'}</Text>
                </Pressable>
              </RNView>
            </RNView>
          </GlassView>
        </RNView>
      </RNView>
    </Modal>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.backdrop,
      ...commonStyles.centered,
      paddingHorizontal: Space.xl,
    },
    card: {
      ...commonStyles.modalCard,
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
    },
    title: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: Space.sm,
    },
    desc: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: FontSize.body * 1.4,
      marginBottom: Space.xl,
    },
    input: {
      width: '100%',
      height: UI_SIZE_54,
      borderRadius: Radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderSecondary,
      backgroundColor: theme.colors.cardPressed,
      color: theme.colors.text,
      fontFamily: MonoFontFamily,
      fontSize: FontSize.caption,
      textAlign: 'center',
      letterSpacing: 1,
      paddingHorizontal: Space.md,
    },
    inputError: {
      borderColor: theme.colors.error,
    },
    errorText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.error,
      textAlign: 'center',
      marginTop: Space.sm,
    },
    actionRow: {
      flexDirection: 'row',
      gap: Space.md,
      width: '100%',
      marginTop: Space.xl,
    },
    cancelBtn: {
      flex: 1,
      height: 50,
      borderRadius: Radii.md,
      ...commonStyles.centered,
      backgroundColor: theme.colors.cardPressed,
      borderWidth: 1,
      borderColor: theme.colors.borderSecondary,
    },
    cancelBtnText: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.textSecondary,
    },
    submitBtn: {
      flex: 1,
      height: 50,
      borderRadius: Radii.md,
      ...commonStyles.centered,
      backgroundColor: theme.colors.primary,
    },
    submitBtnText: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.semiBold,
      color: theme.isDark ? theme.colors.black : theme.colors.white,
    },
    disabledBtn: {
      opacity: 0.3,
    },
  })
  return styles
})
