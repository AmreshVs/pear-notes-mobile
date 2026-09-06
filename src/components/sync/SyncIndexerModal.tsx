import { useTranslation } from 'react-i18next'
import { Modal, Pressable, StyleSheet, View as RNView } from 'react-native'
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
  UI_SIZE_80,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

type Props = {
  visible: boolean
  deviceName: string
  outgoingName: string
  isLocalTarget: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function SyncIndexerModal({
  visible,
  deviceName,
  outgoingName,
  isLocalTarget,
  onCancel,
  onConfirm,
}: Props) {
  const { colors } = useTheme()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const { t } = useTranslation()

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <RNView style={styles.modalFill}>
        <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
        <RNView style={commonStyles.modalOverlay} />

        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />

        <RNView style={styles.modalCenter} pointerEvents="box-none">
          <GlassView intensity={40} borderRadius={32} style={commonStyles.modalCard}>
            <RNView style={commonStyles.modalInner}>
              <RNView style={styles.leaderIcon}>
                <SymbolIcon name="crown" size={UI_ICON_SIZE_40} color={colors.primary} />
              </RNView>

              <Text style={styles.modalTitle}>
                {isLocalTarget
                  ? t('sync.devices.makeIndexerTitleLocal')
                  : t('sync.devices.makeIndexerTitle', { name: deviceName })}
              </Text>
              <Text style={styles.modalSub}>
                {isLocalTarget
                  ? t('sync.devices.makeIndexerBodyLocal', { name: outgoingName })
                  : t('sync.devices.makeIndexerBody', { name: deviceName })}
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
                    styles.confirmBtn,
                    pressed && commonStyles.pressed,
                  ]}
                >
                  <Text style={styles.confirmText}>{t('sync.devices.makeIndexerConfirm')}</Text>
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
    leaderIcon: {
      width: UI_SIZE_80,
      height: UI_SIZE_80,
      borderRadius: Space.xl,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Space.sm,
      backgroundColor: hexWithAlpha(theme.colors.primary, 0.15),
      borderColor: hexWithAlpha(theme.colors.primary, 0.3),
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
      gap: Space.sm,
      width: '100%',
    },
    confirmBtn: {
      backgroundColor: theme.colors.primary,
    },
    confirmText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      color: theme.colors.white,
    },
    cancelText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
  })
  return styles
})
