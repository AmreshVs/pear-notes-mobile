import { Fragment, useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Pressable, ScrollView, StyleSheet, View as RNView } from 'react-native'
import { useDispatch } from 'react-redux'
import { router } from 'expo-router'

import { MAX_VAULTS } from '@pear-notes/core/constant.js'

import { Divider } from '@/components/Divider'
import { DangerActionCard } from '@/components/settings/DangerActionCard'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useColors } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  Radii,
  Space,
  UI_ICON_SIZE_20,
  UI_SIZE_36,
  UI_SIZE_44,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { VAULT_ACTION } from '@/constants/vaultActions'
import { useVaultsScreen } from '@/hooks/useVaultsScreen'
import { JOIN_VAULT_ROUTE } from '@/hooks/useVaultSwitcher'
import { resetAllData } from '@/lib/clearAllData'
import { hapticSelection } from '@/lib/haptics'
import { getVaultErrorKey, getVaultInitial, getVaultLabel } from '@/lib/vaultLabels'
import type { Vault } from '@/lib/vaults.types'
import { buildVaultMenu } from '@/utils/vaultMenu'

import { ContextMenuView } from '../../../../modules/expo-context-menu'

export default function VaultsScreen() {
  const { t } = useTranslation()
  const styles = useStyles()
  const colors = useColors()
  const commonThemedStyles = useCommonThemedStyles()
  const dispatch = useDispatch()
  const screen = useVaultsScreen()
  const { vaults, pending, error, canAdd, canRemove, busy, nameDialog } = screen
  const { openVault, submitName, confirmRemove, setNameDialog } = screen

  useEffect(() => {
    if (!nameDialog) return
    const isCreate = nameDialog.mode === 'create'
    Alert.prompt(
      isCreate ? t('vaults.newVault') : t('vaults.rename'),
      isCreate ? t('vaults.newVaultHint') : undefined,
      [
        { text: t('common.cancel'), style: 'cancel', onPress: () => setNameDialog(null) },
        {
          text: isCreate ? t('vaults.create') : t('vaults.rename'),
          onPress: (value?: string) => submitName(value ?? ''),
        },
      ],
      'plain-text',
      isCreate ? '' : nameDialog.vault.name,
    )
  }, [nameDialog, setNameDialog, submitName, t])

  const askRemove = useCallback(
    (vault: Vault) => {
      const name = getVaultLabel(vault, t)
      Alert.alert(t('vaults.removeTitle', { name }), t('vaults.removeDescription', { name }), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('vaults.removeConfirm'),
          style: 'destructive',
          onPress: () => confirmRemove(vault),
        },
      ])
    },
    [confirmRemove, t],
  )

  const menuLabels = useMemo(
    () => ({ open: t('vaults.openBtn'), rename: t('vaults.rename'), remove: t('vaults.remove') }),
    [t],
  )

  const handleMenuSelect = useCallback(
    (vault: Vault, actionId: string) => {
      if (actionId === VAULT_ACTION.open) openVault(vault)
      if (actionId === VAULT_ACTION.rename) setNameDialog({ mode: 'rename', vault })
      if (actionId === VAULT_ACTION.remove) askRemove(vault)
    },
    [askRemove, openVault, setNameDialog],
  )

  const handleOpen = useCallback(
    (vault: Vault) => {
      if (vault.current) return
      hapticSelection()
      openVault(vault)
    },
    [openVault],
  )

  const askDeleteAll = useCallback(() => {
    Alert.alert(
      t('vaults.deleteAllConfirmTitle'),
      t('vaults.deleteAllDesc', { count: vaults.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('vaults.deleteAllBtn'),
          style: 'destructive',
          onPress: () => resetAllData(dispatch),
        },
      ],
    )
  }, [dispatch, t, vaults.length])

  const handleCreate = useCallback(() => setNameDialog({ mode: 'create' }), [setNameDialog])
  const handleJoin = useCallback(() => router.push(JOIN_VAULT_ROUTE as never), [])

  const renderVault = useCallback(
    (vault: Vault, index: number) => {
      const label = getVaultLabel(vault, t)
      return (
        <Fragment key={vault.id}>
          <ContextMenuView
            items={buildVaultMenu(vault, canRemove, menuLabels)}
            onSelect={(actionId) => handleMenuSelect(vault, actionId)}
            previewCornerRadius={Radii.card}
            menuEnabled={!busy}
          >
            <Pressable
              onPress={() => handleOpen(vault)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{ selected: vault.current, disabled: busy }}
              accessibilityLabel={label}
              accessibilityHint={t('vaults.longPressHint')}
              style={({ pressed }) => [styles.row, pressed && commonStyles.pressed]}
            >
              <RNView style={vault.current ? styles.avatarCurrent : styles.avatar}>
                <Text style={vault.current ? styles.avatarTextCurrent : styles.avatarText}>
                  {getVaultInitial(label)}
                </Text>
              </RNView>
              <RNView style={commonStyles.flex1}>
                <Text style={styles.rowLabel} numberOfLines={1}>
                  {label}
                </Text>
                <Text style={styles.rowSub}>
                  {vault.current ? t('vaults.open') : t('vaults.notOpen')}
                </Text>
              </RNView>
              {vault.current && (
                <SymbolIcon name="checkmark" size={UI_ICON_SIZE_20} color={colors.primary} />
              )}
            </Pressable>
          </ContextMenuView>
          {index < vaults.length - 1 && (
            <RNView style={styles.dividerWrap}>
              <Divider />
            </RNView>
          )}
        </Fragment>
      )
    },
    [
      busy,
      canRemove,
      colors.primary,
      handleMenuSelect,
      handleOpen,
      menuLabels,
      styles,
      t,
      vaults.length,
    ],
  )

  const errorKey = getVaultErrorKey(error)

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.description}>{t('vaults.screenDesc')}</Text>
      <RNView style={commonThemedStyles.card}>{vaults.map(renderVault)}</RNView>
      {pending === 'remove' && <Text style={styles.note}>{t('vaults.removing')}</Text>}
      {!!errorKey && (
        <Text style={styles.error} accessibilityRole="alert">
          {t(errorKey)}
        </Text>
      )}
      {canAdd ? (
        <RNView style={commonThemedStyles.card}>
          <Pressable
            onPress={handleCreate}
            disabled={busy}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && commonStyles.pressed]}
          >
            <SymbolIcon name="plus" size={UI_ICON_SIZE_20} color={colors.primary} />
            <Text style={styles.addLabel}>{t('vaults.newVault')}</Text>
          </Pressable>
          <RNView style={styles.dividerWrap}>
            <Divider />
          </RNView>
          <Pressable
            onPress={handleJoin}
            disabled={busy}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && commonStyles.pressed]}
          >
            <SymbolIcon name="qrcode.viewfinder" size={UI_ICON_SIZE_20} color={colors.primary} />
            <Text style={styles.addLabel}>{t('vaults.join.sectionTitle')}</Text>
          </Pressable>
        </RNView>
      ) : (
        <Text style={styles.note}>{t('vaults.limitReached', { max: MAX_VAULTS })}</Text>
      )}
      <RNView>
        <Text style={[commonThemedStyles.sectionCamelCase, commonStyles.sectionHeader]}>
          {t('storage.dangerZone')}
        </Text>
        <DangerActionCard
          title={t('vaults.deleteAll')}
          description={t('vaults.deleteAllDesc', { count: vaults.length })}
          buttonLabel={t('vaults.deleteAllBtn')}
          disabled={busy}
          onPress={askDeleteAll}
        />
      </RNView>
    </ScrollView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const avatarBase = {
    width: UI_SIZE_36,
    height: UI_SIZE_36,
    borderRadius: Radii.md,
    ...commonStyles.centered,
  }
  const styles = StyleSheet.create({
    scroll: {
      paddingHorizontal: Space.lg,
      paddingTop: Space.md,
      gap: Space.lg,
    },
    description: {
      fontSize: FontSize.body,
      color: theme.colors.textSecondary,
    },
    row: {
      ...commonStyles.row,
      gap: Space.md,
      minHeight: UI_SIZE_44,
      padding: Space.base,
    },
    dividerWrap: {
      marginHorizontal: Space.base,
    },
    avatar: {
      ...avatarBase,
      backgroundColor: theme.colors.controlBackground,
    },
    avatarCurrent: {
      ...avatarBase,
      backgroundColor: theme.colors.primary,
    },
    avatarText: {
      fontFamily: FontFamily.bold,
      fontSize: FontSize.body,
      color: theme.colors.textSecondary,
    },
    avatarTextCurrent: {
      fontFamily: FontFamily.bold,
      fontSize: FontSize.body,
      color: theme.colors.onPrimary,
    },
    rowLabel: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.text,
    },
    rowSub: {
      fontSize: FontSize.caption,
      color: theme.colors.textSecondary,
    },
    addLabel: {
      fontSize: FontSize.subtitle,
      color: theme.colors.primary,
    },
    note: {
      fontSize: FontSize.caption,
      color: theme.colors.textSecondary,
    },
    error: {
      fontSize: FontSize.caption,
      color: theme.colors.error,
    },
  })
  return styles
})
