import { BlurView } from 'expo-blur'
import { router } from 'expo-router'
import { KeyRound } from 'lucide-react-native'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, StyleSheet, View as RNView } from 'react-native'

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
import { hideLockInfo, useLockInfoVisible } from '@/lib/lockInfoModal'

export const LockUnavailableModal = memo(function LockUnavailableModal() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const visible = useLockInfoVisible()

  const handleSetPassword = useCallback(() => {
    hideLockInfo()
    router.push('/settings/note-lock-password?mode=create&purpose=set' as any)
  }, [])

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={hideLockInfo}
    >
      <RNView style={styles.modalFill}>
        <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
        <RNView style={commonStyles.modalOverlay} />

        <Pressable style={StyleSheet.absoluteFill} onPress={hideLockInfo} />

        <RNView style={styles.modalCenter} pointerEvents="box-none">
          <GlassView intensity={40} borderRadius={32} style={commonStyles.modalCard}>
            <RNView style={commonStyles.modalInner}>
              <RNView style={styles.icon}>
                <KeyRound size={UI_ICON_SIZE_40} color={colors.primary} />
              </RNView>

              <Text style={styles.title}>{t('noteCard.authUnavailableTitle')}</Text>
              <Text style={styles.sub}>{t('noteCard.authUnavailableDesc')}</Text>

              <RNView style={styles.row}>
                <Pressable
                  onPress={hideLockInfo}
                  style={({ pressed }) => [
                    styles.btn,
                    commonThemedStyles.cancelBtn,
                    pressed && commonStyles.pressed,
                  ]}
                >
                  <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable
                  onPress={handleSetPassword}
                  style={({ pressed }) => [
                    styles.btn,
                    styles.confirmBtn,
                    pressed && commonStyles.pressed,
                  ]}
                >
                  <Text style={styles.confirmText}>{t('noteCard.authUnavailableAction')}</Text>
                </Pressable>
              </RNView>
            </RNView>
          </GlassView>
        </RNView>
      </RNView>
    </Modal>
  )
})

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
      marginBottom: 28,
      maxWidth: 280,
      color: theme.colors.text,
    },
    row: {
      flexDirection: 'row',
      gap: Space.md,
      width: '100%',
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
    confirmText: {
      color: theme.colors.black,
      fontWeight: FontWeight.bold,
      fontSize: FontSize.body,
    },
  })
  return styles
})
