import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, Modal, Pressable, StyleSheet, View as RNView } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import {
  getVaultUpdateRequired,
  setVaultUpdateRequired,
} from '@pear-notes/core/store/slices/syncSlice.js'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_40,
  UI_SIZE_28,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { useAppUpdateStatus } from '@/hooks/useAppUpdateStatus'
import { hexWithAlpha } from '@/lib/backupUtils'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
}

export const AppUpdateRequiredOverlay = memo(function AppUpdateRequiredOverlay() {
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
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
        <RNView style={styles.backdrop} />

        <RNView style={styles.modalCenter} pointerEvents="box-none">
          <RNView style={styles.card}>
            <RNView style={styles.icon}>
              <MaterialCommunityIcons name="download" size={UI_ICON_SIZE_40} color={c.primary} />
            </RNView>

            <Text style={styles.title}>{t('update.overlay.title')}</Text>
            <Text style={styles.sub}>
              {forVault
                ? t('update.overlay.vaultDescription')
                : t('update.overlay.description', { version: status?.latestVersion })}
            </Text>

            {!!status?.storeUrl && (
              <Pressable
                onPress={handleUpdate}
                style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
              >
                <Text style={styles.btnText}>{t('update.overlay.updateButton')}</Text>
              </Pressable>
            )}
            {forVault && (
              <Pressable
                onPress={() => dispatch(setVaultUpdateRequired(false))}
                style={({ pressed }) => [styles.readOnlyBtn, pressed && styles.btnPressed]}
              >
                <Text style={styles.readOnlyText}>{t('update.overlay.readOnlyButton')}</Text>
              </Pressable>
            )}
          </RNView>
        </RNView>
      </RNView>
    </Modal>
  )
})

const useStyles = createThemedStylesheetWithHooks((theme, md3) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    modalFill: {
      ...StyleSheet.absoluteFill,
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.backdrop,
    },
    modalCenter: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: Space.xl,
    },
    card: {
      width: '100%',
      maxWidth: 320,
      borderRadius: UI_SIZE_28,
      padding: Space.xl,
      alignItems: 'center',
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
    },
    icon: {
      width: 80,
      height: 80,
      borderRadius: UI_SIZE_9999,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Space.sm,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
    },
    title: {
      fontSize: FontSize.heading,
      fontWeight: FontWeight.bold,
      textAlign: 'center',
      marginBottom: Space.sm,
      marginTop: Space.xs,
      color: c.onSurface,
    },
    sub: {
      fontSize: FontSize.body,
      textAlign: 'center',
      lineHeight: 22,
      opacity: 0.85,
      marginBottom: 28,
      color: c.onSurfaceVariant,
    },
    btn: {
      width: '100%',
      height: 50,
      borderRadius: UI_SIZE_9999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primary,
    },
    btnPressed: {
      opacity: 0.85,
    },
    btnText: {
      color: c.onPrimary,
      fontWeight: FontWeight.bold,
      fontSize: FontSize.body,
    },
    readOnlyBtn: {
      marginTop: Space.md,
      paddingVertical: Space.sm,
      alignItems: 'center',
    },
    readOnlyText: {
      color: c.onSurfaceVariant,
      fontWeight: FontWeight.semibold,
      fontSize: FontSize.body,
    },
  })
  return styles
}, useMD3Theme)
