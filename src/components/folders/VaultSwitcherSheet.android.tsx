import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import { BottomSheetModal, BottomSheetView } from '@expo/ui/community/bottom-sheet'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router } from 'expo-router'

import { BottomActionSheet, type SheetAction } from '@/components/android/BottomActionSheet'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { useSheetStyles } from '@/components/android/useSheetStyles'
import { VaultAvatar } from '@/components/android/VaultAvatar'
import { VaultNameDialog } from '@/components/android/VaultNameDialog'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  UI_ICON_SIZE_22,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_48,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { useVaultsScreen } from '@/hooks/useVaultsScreen'
import { VAULTS_SETTINGS_ROUTE } from '@/hooks/useVaultSwitcher'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import { hapticSelection } from '@/lib/haptics'
import { getVaultLabel } from '@/lib/vaultLabels'
import type { Vault } from '@/lib/vaults.types'

type Props = {
  visible: boolean
  onClose: () => void
}

export function VaultSwitcherSheet({ visible, onClose }: Props) {
  const { t } = useTranslation()
  const ref = useRef<BottomSheetModal>(null)
  const afterCloseRef = useRef<(() => void) | null>(null)
  const sheet = useSheetStyles()
  const styles = useStyles()
  const { colors } = useMD3Theme()
  const ripple = useMemo(() => androidRipple(colors.onSurface), [colors.onSurface])

  const screen = useVaultsScreen()
  const { vaults, canRemove, busy, actionVault, removingVault, nameDialog } = screen
  const { setActionVault, setRemovingVault, setNameDialog } = screen
  const { openVault, submitName, confirmRemove } = screen

  useEffect(() => {
    if (visible) ref.current?.present()
    else ref.current?.dismiss()
  }, [visible])

  const backgroundStyle = useMemo(() => sheet.sheetBackground, [sheet.sheetBackground])

  const handleSheetDismiss = useCallback(() => {
    onClose()
    const after = afterCloseRef.current
    afterCloseRef.current = null
    after?.()
  }, [onClose])

  const closeThen = useCallback((after: () => void) => {
    afterCloseRef.current = after
    ref.current?.dismiss()
  }, [])

  const handleOpenVault = useCallback(
    (vault: Vault) => {
      if (vault.current) {
        ref.current?.dismiss()
        return
      }
      hapticSelection()
      closeThen(() => openVault(vault))
    },
    [closeThen, openVault],
  )

  const handleVaultOptions = useCallback(
    (vault: Vault) => {
      hapticSelection()
      closeThen(() => setActionVault(vault))
    },
    [closeThen, setActionVault],
  )

  const handleManage = useCallback(
    () => closeThen(() => router.push(VAULTS_SETTINGS_ROUTE as never)),
    [closeThen],
  )

  const optionActions = useMemo<SheetAction[]>(() => {
    if (!actionVault) return []
    const run = (task: () => void) => () => {
      setActionVault(null)
      task()
    }
    return [
      ...(actionVault.current
        ? []
        : [
            {
              icon: 'folder-open-outline',
              label: t('vaults.openBtn'),
              onPress: run(() => openVault(actionVault)),
            },
          ]),
      {
        icon: 'pencil-outline',
        label: t('vaults.rename'),
        onPress: run(() => setNameDialog({ mode: 'rename', vault: actionVault })),
      },
      ...(canRemove
        ? [
            {
              icon: 'delete-outline',
              label: t('vaults.remove'),
              destructive: true,
              onPress: run(() => setRemovingVault(actionVault)),
            },
          ]
        : []),
    ]
  }, [actionVault, canRemove, openVault, setActionVault, setNameDialog, setRemovingVault, t])

  const removeActions = useMemo<SheetAction[]>(
    () =>
      removingVault
        ? [
            {
              icon: 'delete-outline',
              label: t('vaults.removeConfirm'),
              destructive: true,
              onPress: () => confirmRemove(removingVault),
            },
          ]
        : [],
    [confirmRemove, removingVault, t],
  )

  const closeOptions = useCallback(() => setActionVault(null), [setActionVault])
  const closeRemove = useCallback(() => setRemovingVault(null), [setRemovingVault])
  const closeNameDialog = useCallback(() => setNameDialog(null), [setNameDialog])

  const renderVault = useCallback(
    (vault: Vault, index: number) => (
      <React.Fragment key={vault.id}>
        <VaultSheetRow
          vault={vault}
          label={getVaultLabel(vault, t)}
          disabled={busy}
          onOpen={handleOpenVault}
          onOptions={handleVaultOptions}
        />
        {index < vaults.length - 1 && <View style={styles.divider} />}
      </React.Fragment>
    ),
    [busy, handleOpenVault, handleVaultOptions, styles.divider, t, vaults.length],
  )

  const removingName = removingVault ? getVaultLabel(removingVault, t) : ''
  const isCreateDialog = nameDialog?.mode === 'create'

  return (
    <>
      <BottomSheetModal
        ref={ref}
        enableDynamicSizing
        enablePanDownToClose
        backgroundStyle={backgroundStyle}
        handleIndicatorStyle={sheet.handleIndicator}
        onDismiss={handleSheetDismiss}
      >
        <BottomSheetView style={sheet.content}>
          <View style={styles.header}>
            <Text style={sheet.title}>{t('vaults.title')}</Text>
          </View>

          <View style={styles.card}>{vaults.map(renderVault)}</View>

          <Pressable
            onPress={handleManage}
            android_ripple={ripple}
            accessibilityRole="button"
            style={styles.manageRow}
          >
            <MaterialCommunityIcons
              name="cog-outline"
              size={UI_ICON_SIZE_22}
              color={colors.onSurfaceVariant}
            />
            <Text style={styles.manageText}>{t('vaults.manage')}</Text>
          </Pressable>

          <View style={sheet.bottomPad} />
        </BottomSheetView>
      </BottomSheetModal>

      <BottomActionSheet
        visible={!!actionVault}
        onDismiss={closeOptions}
        title={actionVault ? getVaultLabel(actionVault, t) : ''}
        subtitle={t('vaults.drawer.optionsSubtitle')}
        actions={optionActions}
      />
      <BottomActionSheet
        visible={!!removingVault}
        onDismiss={closeRemove}
        title={t('vaults.removeTitle', { name: removingName })}
        subtitle={t('vaults.removeDescription', { name: removingName })}
        showHeader
        actions={removeActions}
      />
      <VaultNameDialog
        visible={!!nameDialog}
        title={isCreateDialog ? t('vaults.newVault') : t('vaults.rename')}
        confirmLabel={isCreateDialog ? t('vaults.create') : t('vaults.rename')}
        initialName={nameDialog?.mode === 'rename' ? nameDialog.vault.name : ''}
        onCancel={closeNameDialog}
        onConfirm={submitName}
      />
    </>
  )
}

type VaultSheetRowProps = {
  vault: Vault
  label: string
  disabled: boolean
  onOpen: (vault: Vault) => void
  onOptions: (vault: Vault) => void
}

const VaultSheetRow = memo(function VaultSheetRow({
  vault,
  label,
  disabled,
  onOpen,
  onOptions,
}: VaultSheetRowProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const { colors } = useMD3Theme()
  const ripple = useMemo(() => androidRipple(colors.onSurface), [colors.onSurface])
  const handlePress = useCallback(() => onOpen(vault), [onOpen, vault])
  const handleLongPress = useCallback(() => onOptions(vault), [onOptions, vault])

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      disabled={disabled}
      android_ripple={ripple}
      accessibilityRole="button"
      accessibilityState={{ selected: vault.current, disabled }}
      accessibilityLabel={label}
      accessibilityHint={t('vaults.longPressHint')}
      style={styles.row}
    >
      <VaultAvatar label={label} current={vault.current} />
      <View style={commonStyles.flex1}>
        <Text style={styles.rowLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {vault.current ? t('vaults.open') : t('vaults.notOpen')}
        </Text>
      </View>
      {vault.current && (
        <MaterialCommunityIcons name="check" size={UI_ICON_SIZE_22} color={colors.primary} />
      )}
    </Pressable>
  )
})

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHighest?: string
  outlineVariant?: string
}

const useStyles = createThemedStylesheetWithHooks((_theme, md3) => {
  const c = md3.colors as ExtendedColors
  const hairline = c.outlineVariant ?? hexWithAlpha(c.onSurface, 0.12)
  const styles = StyleSheet.create({
    header: {
      paddingHorizontal: UI_SIZE_4,
      paddingTop: UI_SIZE_4,
      paddingBottom: UI_SIZE_12,
    },
    card: {
      borderRadius: UI_SIZE_20,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
      overflow: 'hidden',
      backgroundColor: c.surfaceContainerHighest ?? c.surfaceVariant,
    },
    row: {
      ...commonStyles.row,
      gap: UI_SIZE_16,
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_14,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: hairline,
    },
    rowLabel: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
    },
    rowSub: {
      fontSize: FontSize.caption,
      color: c.onSurfaceVariant,
    },
    manageRow: {
      ...commonStyles.row,
      alignSelf: 'flex-start',
      gap: UI_SIZE_12,
      minHeight: UI_SIZE_48,
      marginTop: UI_SIZE_8,
      paddingHorizontal: UI_SIZE_8,
      borderRadius: UI_SIZE_9999,
      overflow: 'hidden',
    },
    manageText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      color: c.onSurfaceVariant,
    },
  })
  return styles
}, useMD3Theme)
