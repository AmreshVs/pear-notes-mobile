import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native'
import { TextInput as PaperTextInput } from 'react-native-paper'

import { VAULT_NAME_MAX_LENGTH } from '@pear-notes/core/constant.js'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  UI_SIZE_4,
  UI_SIZE_10,
  UI_SIZE_16,
  UI_SIZE_24,
  UI_SIZE_48,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'

type Props = {
  visible: boolean
  title: string
  confirmLabel: string
  initialName: string
  onCancel: () => void
  onConfirm: (name: string) => void
}

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHighest?: string
}

const DIALOG_MAX_WIDTH = 400

export function VaultNameDialog({
  visible,
  title,
  confirmLabel,
  initialName,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const [name, setName] = useState(initialName)
  const ripple = useMemo(() => androidRipple(md3.colors.onSurface), [md3.colors.onSurface])

  useEffect(() => {
    if (visible) setName(initialName)
  }, [visible, initialName])

  const handleConfirm = useCallback(() => onConfirm(name), [name, onConfirm])
  const handleNoop = useCallback(() => {}, [])

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.dialog} onPress={handleNoop}>
          <Text style={styles.title}>{title}</Text>
          <PaperTextInput
            value={name}
            onChangeText={setName}
            onSubmitEditing={handleConfirm}
            autoFocus
            mode="outlined"
            maxLength={VAULT_NAME_MAX_LENGTH}
            label={t('vaults.nameLabel')}
          />
          <View style={styles.actions}>
            <Pressable onPress={onCancel} android_ripple={ripple} style={styles.button}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              disabled={!name.trim()}
              android_ripple={ripple}
              style={styles.button}
            >
              <Text style={name.trim() ? styles.confirmText : styles.confirmTextDisabled}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const useDialogHooks = () => {
  const md3 = useMD3Theme()
  const dims = useWindowDimensions()
  return { md3, dims }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3, dims }) => {
  const c = md3.colors as ExtendedColors
  const buttonText = {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    fontFamily: FontFamily.semiBold,
  }
  const styles = StyleSheet.create({
    overlay: {
      ...commonStyles.flex1,
      backgroundColor: theme.colors.backdrop,
      ...commonStyles.centered,
    },
    dialog: {
      backgroundColor: c.surfaceContainerHighest ?? c.surface,
      borderRadius: Radii.xl,
      padding: UI_SIZE_24,
      width: Math.min(dims.width - UI_SIZE_48, DIALOG_MAX_WIDTH),
      elevation: 6,
    },
    title: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      marginBottom: UI_SIZE_16,
      color: c.onSurface,
    },
    actions: {
      ...commonStyles.row,
      justifyContent: 'flex-end',
      marginTop: UI_SIZE_16,
      gap: UI_SIZE_4,
    },
    button: {
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_10,
    },
    cancelText: {
      ...buttonText,
      color: c.onSurfaceVariant,
    },
    confirmText: {
      ...buttonText,
      color: c.primary,
    },
    confirmTextDisabled: {
      ...buttonText,
      color: c.onSurfaceVariant,
    },
  })
  return styles
}, useDialogHooks)
