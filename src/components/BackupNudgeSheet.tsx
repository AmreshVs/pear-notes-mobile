import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, StyleSheet, View as RNView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_24,
  UI_SIZE_50,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

import type { BackupNudgeSheetProps } from './BackupNudge.types'

export function BackupNudgeSheet({
  visible,
  onClose,
  onBackUp,
  onLinkDevice,
}: BackupNudgeSheetProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const afterDismissRef = useRef<(() => void) | null>(null)

  const closeThen = useCallback(
    (next: (() => void) | null) => {
      afterDismissRef.current = next
      onClose()
    },
    [onClose],
  )

  const handleDismissed = useCallback(() => {
    const next = afterDismissRef.current
    afterDismissRef.current = null
    next?.()
  }, [])

  const handleBackUp = useCallback(() => closeThen(onBackUp), [closeThen, onBackUp])
  const handleLinkDevice = useCallback(() => closeThen(onLinkDevice), [closeThen, onLinkDevice])
  const handleNotNow = useCallback(() => closeThen(null), [closeThen])

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleNotNow}
      onDismiss={handleDismissed}
    >
      <RNView style={commonStyles.modalOverlay} />
      <Pressable style={StyleSheet.absoluteFill} onPress={handleNotNow} />
      <RNView style={styles.anchor} pointerEvents="box-none">
        <RNView style={styles.card}>
          <RNView style={styles.icon}>
            <SymbolIcon name="lock.shield" size={UI_ICON_SIZE_24} color={colors.primary} />
          </RNView>
          <Text style={styles.title}>{t('backupNudge.sheet.title')}</Text>
          <Text style={styles.body}>{t('backupNudge.sheet.description')}</Text>
          <Pressable
            onPress={handleBackUp}
            style={({ pressed }) => [
              styles.btn,
              styles.primaryBtn,
              pressed && commonStyles.pressed,
            ]}
          >
            <Text style={styles.primaryText}>{t('backupNudge.backUpNow')}</Text>
          </Pressable>
          <Pressable
            onPress={handleLinkDevice}
            style={({ pressed }) => [
              styles.btn,
              styles.secondaryBtn,
              pressed && commonStyles.pressed,
            ]}
          >
            <Text style={styles.secondaryText}>{t('backupNudge.sheet.linkDevice')}</Text>
          </Pressable>
          <Pressable
            onPress={handleNotNow}
            style={({ pressed }) => [styles.notNow, pressed && commonStyles.pressed]}
          >
            <Text style={styles.notNowText}>{t('backupNudge.sheet.notNow')}</Text>
          </Pressable>
        </RNView>
      </RNView>
    </Modal>
  )
}

const useStyles = createThemedStylesheetWithHooks(
  (theme, { insets }) => {
    const styles = StyleSheet.create({
      anchor: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingHorizontal: Space.lg,
        paddingBottom: insets.bottom + Space.lg,
      },
      card: {
        backgroundColor: theme.colors.surface,
        borderRadius: Radii.card,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.borderSecondary,
        boxShadow: theme.colors.cardShadow,
        padding: Space.lg,
        gap: Space.sm,
      },
      icon: {
        width: 44,
        height: 44,
        borderRadius: Radii.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: hexWithAlpha(theme.colors.primary, 0.1),
      },
      title: {
        fontSize: FontSize.heading,
        fontWeight: FontWeight.bold,
        color: theme.colors.text,
      },
      body: {
        fontSize: FontSize.body,
        lineHeight: 22,
        color: theme.colors.textSecondary,
        marginBottom: Space.sm,
      },
      btn: {
        minHeight: UI_SIZE_50,
        borderRadius: Radii.md,
        alignItems: 'center',
        justifyContent: 'center',
      },
      primaryBtn: {
        backgroundColor: theme.colors.primary,
      },
      primaryText: {
        fontSize: FontSize.body,
        fontWeight: FontWeight.bold,
        color: theme.colors.onPrimary,
      },
      secondaryBtn: {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.borderSecondary,
      },
      secondaryText: {
        fontSize: FontSize.body,
        fontWeight: FontWeight.bold,
        color: theme.colors.text,
      },
      notNow: {
        alignItems: 'center',
        paddingVertical: Space.sm,
      },
      notNowText: {
        fontSize: FontSize.body,
        color: theme.colors.textSecondary,
      },
    })
    return styles
  },
  () => ({
    insets: useSafeAreaInsets(),
  }),
)
