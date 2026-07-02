import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, View as RNView, StyleSheet, TextInput } from 'react-native'

import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_SIZE_54,
} from '@/constants/commonStyles'
import { isValidRecoveryKey } from '@/lib/backupUtils'
import { useToast } from '@/providers/ToastProvider'

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
  const { showToast } = useToast()

  const handleSubmit = () => {
    const trimmed = inputValue.trim()
    if (!isValidRecoveryKey(trimmed)) {
      showToast(t('backup.invalidKeyDesc'))
      return
    }
    onSubmit(trimmed)
    setInputValue('')
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <RNView style={styles.overlay}>
        <RNView style={styles.card}>
          <Text style={styles.title}>{t('backup.enterRecoveryKeyTitle')}</Text>
          <Text style={styles.desc}>{t('backup.enterRecoveryKeyDesc')}</Text>

          <TextInput
            style={styles.input}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="0123456789abcdef..."
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={64}
          />

          <RNView style={styles.actionRow}>
            <Pressable
              onPress={onClose}
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
    },
    card: {
      width: '85%',
      borderRadius: Radii.xl,
      backgroundColor: theme.colors.surface,
      padding: Space.xl,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
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
      height: UI_SIZE_54,
      borderRadius: Radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderSecondary,
      backgroundColor: theme.colors.controlBackground,
      color: theme.colors.text,
      fontFamily: FontFamily.regular,
      fontSize: FontSize.subtitle,
      paddingHorizontal: Space.md,
      marginBottom: Space.xl,
    },
    actionRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: Space.md,
    },
    cancelBtn: {
      height: UI_SIZE_54,
      borderRadius: Radii.pill,
      paddingHorizontal: Space.xl,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cancelBtnText: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.textMuted,
    },
    submitBtn: {
      height: UI_SIZE_54,
      borderRadius: Radii.pill,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: Space.xl,
      justifyContent: 'center',
      alignItems: 'center',
    },
    submitBtnText: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.black,
    },
    disabledBtn: {
      opacity: 0.5,
    },
  })
  return styles
})
