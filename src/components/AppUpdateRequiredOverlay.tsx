import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, Modal, Pressable, StyleSheet, View as RNView } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { BlurView } from 'expo-blur'

import {
  getVaultUpdateRequired,
  setVaultUpdateRequired,
} from '@pear-notes/core/store/slices/syncSlice.js'

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
import { useAppUpdateStatus } from '@/hooks/useAppUpdateStatus'
import { hexWithAlpha } from '@/lib/backupUtils'

export const AppUpdateRequiredOverlay = memo(function AppUpdateRequiredOverlay() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const status = useAppUpdateStatus()
  const dispatch = useDispatch()
  const vaultUpdateRequired = useSelector(getVaultUpdateRequired)

  const forVault = vaultUpdateRequired && !status?.mandatory
  const visible = !!status?.mandatory || vaultUpdateRequired

  const handleUpdate = () => {
    if (status?.storeUrl) Linking.openURL(status.storeUrl)
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <RNView style={styles.modalFill}>
        <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
        <RNView style={commonStyles.modalOverlay} />

        <RNView style={styles.modalCenter} pointerEvents="box-none">
          <GlassView intensity={40} borderRadius={32} style={commonStyles.modalCard}>
            <RNView style={commonStyles.modalInner}>
              <RNView style={styles.icon}>
                <SymbolIcon
                  name="square.and.arrow.down"
                  size={UI_ICON_SIZE_40}
                  color={colors.primary}
                />
              </RNView>

              <Text style={styles.title}>{t('update.overlay.title')}</Text>
              <Text style={styles.sub}>
                {forVault
                  ? t('update.overlay.vaultDescription')
                  : t('update.overlay.description', { version: status?.latestVersion })}
              </Text>

              <RNView style={styles.row}>
                {!!status?.storeUrl && (
                  <Pressable
                    onPress={handleUpdate}
                    style={({ pressed }) => [
                      styles.btn,
                      styles.confirmBtn,
                      pressed && commonStyles.pressed,
                    ]}
                  >
                    <Text style={styles.confirmText}>{t('update.overlay.updateButton')}</Text>
                  </Pressable>
                )}
              </RNView>
              {forVault && (
                <Pressable
                  onPress={() => dispatch(setVaultUpdateRequired(false))}
                  style={({ pressed }) => [styles.readOnlyBtn, pressed && commonStyles.pressed]}
                >
                  <Text style={styles.readOnlyText}>{t('update.overlay.readOnlyButton')}</Text>
                </Pressable>
              )}
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
      minHeight: UI_SIZE_50,
      paddingVertical: Space.sm,
      borderRadius: Radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmBtn: {
      backgroundColor: theme.colors.primary,
    },
    confirmText: {
      color: theme.colors.onPrimary,
      fontWeight: FontWeight.bold,
      fontSize: FontSize.body,
    },
    readOnlyBtn: {
      marginTop: Space.md,
      paddingVertical: Space.sm,
      alignItems: 'center',
    },
    readOnlyText: {
      color: theme.colors.textMuted,
      fontWeight: FontWeight.semibold,
      fontSize: FontSize.body,
    },
  })
  return styles
})
