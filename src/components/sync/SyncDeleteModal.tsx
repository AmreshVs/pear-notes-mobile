import { useTranslation } from 'react-i18next'
import { Animated, Modal, Pressable, StyleSheet, View as RNView } from 'react-native'
import { BlurView } from 'expo-blur'
import { ShieldAlert } from 'lucide-react-native'

import { GlassView } from '@/components/GlassView'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  LetterSpacing,
  Radii,
  Space,
  UI_ICON_SIZE_40,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

type Props = {
  visible: boolean
  fadeAnim: Animated.Value
  onCancel: () => void
  onConfirm: () => void
}

export function SyncDeleteModal({ visible, fadeAnim, onCancel, onConfirm }: Props) {
  const { colors } = useTheme()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const { t } = useTranslation()

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Animated.View style={[styles.modalFill, { opacity: fadeAnim }]}>
        <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
        <RNView style={commonStyles.modalOverlay} />

        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />

        <RNView style={styles.modalCenter} pointerEvents="box-none">
          <GlassView intensity={40} borderRadius={32} style={commonStyles.modalCard}>
            <RNView style={commonStyles.modalInner}>
              <RNView style={styles.dangerIcon}>
                <ShieldAlert size={UI_ICON_SIZE_40} color={colors.error} />
              </RNView>

              <Text style={styles.modalTitle}>{t('sync.delete.title')}</Text>
              <Text style={styles.modalSub}>{t('sync.delete.description')}</Text>

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
      height: 50,
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
      borderWidth: 1,
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
