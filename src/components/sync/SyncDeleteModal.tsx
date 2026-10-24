import { useTranslation } from 'react-i18next'
import { Modal, Pressable, StyleSheet, View as RNView } from 'react-native'
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated'
import { BlurView } from 'expo-blur'

import { GlassView } from '@/components/GlassView'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  LetterSpacing,
  Radii,
  Space,
  UI_ICON_SIZE_40,
  UI_SIZE_50,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { useModalCardStyle } from '@/hooks/useModalCardStyle'
import { useOpenVault } from '@/hooks/useOpenVault'
import { hexWithAlpha } from '@/lib/backupUtils'
import { getVaultLabel } from '@/lib/vaultLabels'

type Props = {
  visible: boolean
  opacity: SharedValue<number>
  onCancel: () => void
  onConfirm: () => void
}

export function SyncDeleteModal({ visible, opacity, onCancel, onConfirm }: Props) {
  const { colors } = useTheme()
  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))
  const styles = useStyles()
  const modalCardStyle = useModalCardStyle()
  const commonThemedStyles = useCommonThemedStyles()
  const { t } = useTranslation()
  const { openVault } = useOpenVault()
  const vaultName = getVaultLabel(openVault, t)

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Animated.View style={[styles.modalFill, fadeStyle]}>
        <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
        <RNView style={commonStyles.modalOverlay} />

        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />

        <RNView style={styles.modalCenter} pointerEvents="box-none">
          <GlassView intensity={40} borderRadius={32} style={modalCardStyle}>
            <RNView style={commonStyles.modalInner}>
              <RNView style={styles.dangerIcon}>
                <SymbolIcon
                  name="exclamationmark.shield"
                  size={UI_ICON_SIZE_40}
                  color={colors.error}
                />
              </RNView>

              <Text style={styles.modalTitle}>{t('sync.delete.title', { name: vaultName })}</Text>
              <Text style={styles.modalSub}>
                {t('sync.delete.description', { name: vaultName })}
              </Text>

              <RNView style={styles.modalRow}>
                <Pressable
                  onPress={onCancel}
                  style={({ pressed }) => [
                    styles.modalBtn,
                    commonThemedStyles.cancelBtn,
                    pressed && commonStyles.pressed,
                  ]}
                >
                  <Text style={styles.cancelText}>{t('sync.delete.cancel')}</Text>
                </Pressable>
                <Pressable
                  onPress={onConfirm}
                  style={({ pressed }) => [
                    styles.modalBtn,
                    styles.removeBtn,
                    pressed && commonStyles.pressed,
                  ]}
                >
                  <Text style={styles.removeText}>{t('sync.delete.remove')}</Text>
                </Pressable>
              </RNView>
            </RNView>
          </GlassView>
        </RNView>
      </Animated.View>
    </Modal>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    modalFill: {
      ...StyleSheet.absoluteFill,
    },
    modalCenter: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: Space.xl,
    },
    modalBtn: {
      flex: 1,
      minHeight: UI_SIZE_50,
      paddingVertical: Space.sm,
      borderRadius: Radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dangerIcon: {
      width: 80,
      height: 80,
      borderRadius: Space.xl,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Space.sm,
      backgroundColor: hexWithAlpha(theme.colors.error, 0.15),
      borderColor: hexWithAlpha(theme.colors.error, 0.3),
    },
    modalTitle: {
      fontSize: FontSize.heading,
      fontWeight: FontWeight.bold,
      textAlign: 'center',
      letterSpacing: LetterSpacing.tight,
      marginBottom: Space.sm,
      marginTop: Space.xs,
      color: theme.colors.text,
    },
    modalSub: {
      fontSize: FontSize.body,
      textAlign: 'center',
      lineHeight: 22,
      opacity: 0.7,
      marginBottom: 28,
      maxWidth: 280,
      color: theme.colors.text,
    },
    modalRow: {
      flexDirection: 'row',
      gap: Space.md,
      width: '100%',
    },
    cancelText: {
      color: theme.colors.textMuted,
      fontWeight: FontWeight.bold,
      fontSize: FontSize.body,
    },
    removeBtn: {
      backgroundColor: theme.colors.error,
    },
    removeText: {
      color: theme.colors.white,
      fontWeight: FontWeight.bold,
      fontSize: FontSize.body,
    },
  })
  return styles
})
