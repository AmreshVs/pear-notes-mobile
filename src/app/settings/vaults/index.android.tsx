import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch } from 'react-redux'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router, Stack } from 'expo-router'

import { MAX_VAULTS } from '@pear-notes/core/constant.js'

import { AndroidSettingsAppBar } from '@/components/android/AndroidSettingsAppBar'
import { BottomActionSheet, type SheetAction } from '@/components/android/BottomActionSheet'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { VaultNameDialog } from '@/components/android/VaultNameDialog'
import { DangerActionCard } from '@/components/settings/DangerActionCard'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  Radii,
  UI_ICON_SIZE_20,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_28,
  UI_SIZE_40,
  UI_SIZE_48,
  UI_SIZE_56,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { useVaultsScreen } from '@/hooks/useVaultsScreen'
import { JOIN_VAULT_ROUTE } from '@/hooks/useVaultSwitcher'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import { resetAllData } from '@/lib/clearAllData'
import { getVaultErrorKey, getVaultInitial, getVaultLabel } from '@/lib/vaultLabels'
import type { Vault } from '@/lib/vaults.types'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  onSurfaceVariant?: string
}

export default function AndroidVaultsScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const screen = useVaultsScreen()
  const { vaults, pending, error, canAdd, canRemove, busy } = screen
  const { actionVault, removingVault, nameDialog } = screen
  const { setActionVault, setRemovingVault, setNameDialog } = screen
  const { openVault, submitName, confirmRemove } = screen

  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const dispatch = useDispatch()
  const [deleteAllVisible, setDeleteAllVisible] = useState(false)
  const openDeleteAll = useCallback(() => setDeleteAllVisible(true), [])
  const closeDeleteAll = useCallback(() => setDeleteAllVisible(false), [])
  const deleteAllActions = useMemo<SheetAction[]>(
    () => [
      {
        icon: 'delete-forever-outline',
        label: t('vaults.deleteAllBtn'),
        destructive: true,
        onPress: () => {
          setDeleteAllVisible(false)
          resetAllData(dispatch)
        },
      },
    ],
    [dispatch, t],
  )
  const rippleOnTonal = useMemo(
    () => androidRipple(c.onSecondaryContainer),
    [c.onSecondaryContainer],
  )

  const closeActions = useCallback(() => setActionVault(null), [setActionVault])
  const closeRemove = useCallback(() => setRemovingVault(null), [setRemovingVault])
  const closeNameDialog = useCallback(() => setNameDialog(null), [setNameDialog])
  const handleCreate = useCallback(() => setNameDialog({ mode: 'create' }), [setNameDialog])
  const handleOpen = useCallback(
    (vault: Vault) => {
      if (!vault.current) openVault(vault)
    },
    [openVault],
  )
  const handleJoin = useCallback(() => router.push(JOIN_VAULT_ROUTE as never), [])

  const sheetActions = useMemo<SheetAction[]>(() => {
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

  const renderVault = useCallback(
    (vault: Vault, index: number) => {
      const label = getVaultLabel(vault, t)
      return (
        <Pressable
          key={vault.id}
          onPress={() => handleOpen(vault)}
          onLongPress={() => setActionVault(vault)}
          accessibilityHint={t('vaults.longPressHint')}
          disabled={busy}
          android_ripple={ripple}
          accessibilityRole="button"
          accessibilityState={{ selected: vault.current, disabled: busy }}
          accessibilityLabel={label}
          style={index < vaults.length - 1 ? styles.rowDivider : styles.row}
        >
          <View style={vault.current ? styles.avatarCurrent : styles.avatar}>
            <Text style={vault.current ? styles.avatarTextCurrent : styles.avatarText}>
              {getVaultInitial(label)}
            </Text>
          </View>
          <View style={commonStyles.flex1}>
            <Text style={styles.rowLabel} numberOfLines={1}>
              {label}
            </Text>
            <Text style={styles.rowSub}>
              {vault.current ? t('vaults.open') : t('vaults.notOpen')}
            </Text>
          </View>
          {vault.current && (
            <MaterialCommunityIcons name="check" size={UI_ICON_SIZE_20} color={c.primary} />
          )}
        </Pressable>
      )
    },
    [busy, c.primary, ripple, setActionVault, styles, t, vaults.length],
  )

  const errorKey = getVaultErrorKey(error)
  const removingName = removingVault ? getVaultLabel(removingVault, t) : ''
  const isCreateDialog = nameDialog?.mode === 'create'

  return (
    <View style={styles.root}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <Stack.Screen options={{ headerShown: false }} />
      <AndroidSettingsAppBar title={t('vaults.title')} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.description}>{t('vaults.screenDesc')}</Text>
        <View style={styles.card}>{vaults.map(renderVault)}</View>
        {pending === 'remove' && <Text style={styles.note}>{t('vaults.removing')}</Text>}
        {!!errorKey && (
          <Text style={styles.error} accessibilityRole="alert">
            {t(errorKey)}
          </Text>
        )}
        {canAdd ? (
          <View style={styles.buttonRow}>
            <Pressable
              onPress={handleCreate}
              disabled={busy}
              android_ripple={rippleOnTonal}
              accessibilityRole="button"
              style={styles.tonalButton}
            >
              <MaterialCommunityIcons
                name="plus"
                size={UI_ICON_SIZE_20}
                color={c.onSecondaryContainer}
              />
              <Text style={styles.tonalButtonText}>{t('vaults.newVault')}</Text>
            </Pressable>
            <Pressable
              onPress={handleJoin}
              disabled={busy}
              android_ripple={ripple}
              accessibilityRole="button"
              style={styles.outlinedButton}
            >
              <MaterialCommunityIcons name="qrcode-scan" size={UI_ICON_SIZE_20} color={c.primary} />
              <Text style={styles.outlinedButtonText}>{t('vaults.join.sectionTitle')}</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.note}>{t('vaults.limitReached', { max: MAX_VAULTS })}</Text>
        )}
        <View style={styles.dangerSection}>
          <Text style={styles.dangerHeader}>{t('storage.dangerZone')}</Text>
          <DangerActionCard
            title={t('vaults.deleteAll')}
            description={t('vaults.deleteAllDesc', { count: vaults.length })}
            buttonLabel={t('vaults.deleteAllBtn')}
            disabled={busy}
            onPress={openDeleteAll}
          />
        </View>
      </ScrollView>

      <BottomActionSheet
        visible={!!actionVault}
        onDismiss={closeActions}
        title={actionVault ? getVaultLabel(actionVault, t) : ''}
        actions={sheetActions}
      />
      <BottomActionSheet
        visible={!!removingVault}
        onDismiss={closeRemove}
        title={t('vaults.removeTitle', { name: removingName })}
        subtitle={t('vaults.removeDescription', { name: removingName })}
        showHeader
        actions={removeActions}
      />
      <BottomActionSheet
        visible={deleteAllVisible}
        onDismiss={closeDeleteAll}
        title={t('vaults.deleteAllConfirmTitle')}
        subtitle={t('vaults.deleteAllDesc', { count: vaults.length })}
        showHeader
        actions={deleteAllActions}
      />
      <VaultNameDialog
        visible={!!nameDialog}
        title={isCreateDialog ? t('vaults.newVault') : t('vaults.rename')}
        confirmLabel={isCreateDialog ? t('vaults.create') : t('vaults.rename')}
        initialName={nameDialog?.mode === 'rename' ? nameDialog.vault.name : ''}
        onCancel={closeNameDialog}
        onConfirm={submitName}
      />
    </View>
  )
}

const useVaultsScreenHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks((_theme, { md3, insets }) => {
  const c = md3.colors as ExtendedColors
  const avatarBase = {
    width: UI_SIZE_40,
    height: UI_SIZE_40,
    borderRadius: Radii.md,
    ...commonStyles.centered,
  }
  const buttonBase = {
    ...commonStyles.row,
    ...commonStyles.flex1,
    justifyContent: 'center' as const,
    gap: UI_SIZE_8,
    minHeight: UI_SIZE_48,
    borderRadius: UI_SIZE_9999,
    overflow: 'hidden' as const,
  }
  const rowBase = {
    ...commonStyles.row,
    gap: UI_SIZE_16,
    minHeight: UI_SIZE_56,
    paddingVertical: UI_SIZE_12,
  }
  const styles = StyleSheet.create({
    root: {
      ...commonStyles.flex1,
      backgroundColor: c.background,
    },
    scrollContent: {
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: insets.bottom + UI_SIZE_40,
      gap: UI_SIZE_16,
    },
    description: {
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
    },
    card: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      overflow: 'hidden',
    },
    row: {
      ...rowBase,
      paddingHorizontal: UI_SIZE_20,
    },
    rowDivider: {
      ...rowBase,
      marginHorizontal: UI_SIZE_20,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: hexWithAlpha(c.onSurface, 0.12),
    },
    avatar: {
      ...avatarBase,
      backgroundColor: hexWithAlpha(c.onSurface, 0.08),
    },
    avatarCurrent: {
      ...avatarBase,
      backgroundColor: c.primaryContainer,
    },
    avatarText: {
      fontFamily: FontFamily.bold,
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
    },
    avatarTextCurrent: {
      fontFamily: FontFamily.bold,
      fontSize: FontSize.body,
      color: c.onPrimaryContainer,
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
    dangerSection: {
      gap: UI_SIZE_8,
      marginTop: UI_SIZE_16,
    },
    dangerHeader: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
      marginLeft: UI_SIZE_8,
    },
    buttonRow: {
      ...commonStyles.row,
      gap: UI_SIZE_12,
    },
    tonalButton: {
      ...buttonBase,
      backgroundColor: c.secondaryContainer,
    },
    tonalButtonText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      color: c.onSecondaryContainer,
    },
    outlinedButton: {
      ...buttonBase,
      borderWidth: 1,
      borderColor: c.outline,
    },
    outlinedButtonText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      color: c.primary,
    },
    note: {
      fontSize: FontSize.caption,
      color: c.onSurfaceVariant,
    },
    error: {
      fontSize: FontSize.caption,
      color: c.error,
    },
  })
  return styles
}, useVaultsScreenHooks)
