import { memo, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Platform, Pressable, StyleSheet, View as RNView } from 'react-native'

import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_40,
  UI_SIZE_50,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'
import { type DeviceAuthMethod, getDeviceAuthMethod } from '@/lib/deviceAuth'
import { resolveNoteLockPrompt, useNoteLockPrompt } from '@/lib/noteLockPrompt'
import { getLockMethodLabelKey } from '@/utils/settingsUtils'

const decline = () => resolveNoteLockPrompt(false)
const accept = () => resolveNoteLockPrompt(true)

export const NoteLockPromptModal = memo(function NoteLockPromptModal() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const kind = useNoteLockPrompt()
  const [deviceMethod, setDeviceMethod] = useState<DeviceAuthMethod>('none')

  useEffect(() => {
    if (kind) getDeviceAuthMethod().then(setDeviceMethod)
  }, [kind])

  const method = deviceMethod === 'none' ? '' : t(getLockMethodLabelKey(deviceMethod))
  const isOffer = kind === 'biometricOffer'
  const title = isOffer
    ? t('noteLockPrompt.biometricTitle', { method })
    : t('noteLockPrompt.migrationTitle')
  const body = isOffer
    ? t('noteLockPrompt.biometricBody', { method })
    : t('noteLockPrompt.migrationBody', { method })
  const confirm = isOffer
    ? t('noteLockPrompt.useBiometric', { method })
    : t('noteLockPrompt.setPassword')

  return (
    <Modal
      visible={kind !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={decline}
    >
      <RNView style={styles.scrim}>
        <RNView style={styles.card}>
          <RNView style={styles.icon}>
            <SymbolIcon
              name={isOffer ? 'faceid' : 'lock'}
              size={UI_ICON_SIZE_40}
              color={colors.primary}
            />
          </RNView>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <Pressable
            onPress={accept}
            style={({ pressed }) => [
              styles.btn,
              styles.confirmBtn,
              pressed && commonStyles.pressed,
            ]}
          >
            <Text style={styles.confirmText}>{confirm}</Text>
          </Pressable>
          <Pressable
            onPress={decline}
            style={({ pressed }) => [styles.btn, pressed && commonStyles.pressed]}
          >
            <Text style={styles.cancelText}>{t('noteLockPrompt.notNow')}</Text>
          </Pressable>
        </RNView>
      </RNView>
    </Modal>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    scrim: {
      flex: 1,
      ...commonStyles.centered,
      paddingHorizontal: Space.xl,
      backgroundColor: hexWithAlpha('#000000', 0.4),
    },
    card: {
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
      padding: Space.xl,
      borderRadius: Platform.OS === 'android' ? 28 : 32,
      backgroundColor: theme.colors.background,
    },
    icon: {
      width: 80,
      height: 80,
      borderRadius: Space.xl,
      ...commonStyles.centered,
      marginBottom: Space.sm,
      backgroundColor: hexWithAlpha(theme.colors.primary, 0.15),
    },
    title: {
      fontSize: FontSize.heading,
      fontWeight: FontWeight.bold,
      textAlign: 'center',
      marginBottom: Space.sm,
      color: theme.colors.text,
    },
    body: {
      fontSize: FontSize.body,
      textAlign: 'center',
      lineHeight: 22,
      opacity: 0.7,
      marginBottom: Space.lg,
      color: theme.colors.text,
    },
    btn: {
      width: '100%',
      minHeight: UI_SIZE_50,
      borderRadius: Radii.md,
      ...commonStyles.centered,
    },
    confirmBtn: {
      backgroundColor: theme.colors.primary,
      marginBottom: Space.sm,
    },
    confirmText: {
      color: theme.colors.onPrimary,
      fontWeight: FontWeight.bold,
      fontSize: FontSize.body,
    },
    cancelText: {
      color: theme.colors.textMuted,
      fontWeight: FontWeight.bold,
      fontSize: FontSize.body,
    },
  })
  return styles
})
