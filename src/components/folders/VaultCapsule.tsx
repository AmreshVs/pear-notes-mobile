import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Pressable, StyleSheet, View } from 'react-native'
import { useDispatch } from 'react-redux'
import { router } from 'expo-router'

import { createVault, switchVault } from '@pear-notes/core/store/slices/vaultsSlice.js'

import {
  type VaultSheetAction,
  VaultSwitcherBottomSheet,
} from '@/components/bottomsheet/VaultSwitcherBottomSheet'
import { GlassView } from '@/components/GlassView'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useColors } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  GlassIntensity,
  Radii,
  Space,
  UI_ICON_SIZE_14,
  UI_SIZE_2,
  UI_SIZE_28,
  UI_SIZE_40,
} from '@/constants/commonStyles'
import { JOIN_VAULT_ROUTE, useVaultSwitcher, VAULTS_SETTINGS_ROUTE } from '@/hooks/useVaultSwitcher'
import { hapticSelection } from '@/lib/haptics'
import { getVaultInitial, getVaultLabel } from '@/lib/vaultLabels'
import type { Vault } from '@/lib/vaults.types'

import { ContextMenuView } from '../../../modules/expo-context-menu'

const QUICK_SWITCH_PREFIX = 'vault:'
const CAPSULE_MAX_WIDTH = 200

const ROUTES: Record<Exclude<VaultSheetAction, 'create'>, string> = {
  join: JOIN_VAULT_ROUTE,
  manage: VAULTS_SETTINGS_ROUTE,
}

export function VaultCapsule() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const styles = useStyles()
  const colors = useColors()
  const { vaults, currentVault, visible, busy, canAdd, sheetOpen, setSheetOpen } =
    useVaultSwitcher()

  const openSheet = useCallback(() => {
    hapticSelection()
    setSheetOpen(true)
  }, [setSheetOpen])
  const closeSheet = useCallback(() => setSheetOpen(false), [setSheetOpen])

  const handleSelectVault = useCallback(
    (vault: Vault) => {
      setSheetOpen(false)
      dispatch(switchVault({ id: vault.id }))
    },
    [dispatch, setSheetOpen],
  )

  const promptNewVault = useCallback(() => {
    Alert.prompt(
      t('vaults.newVault'),
      t('vaults.newVaultHint'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('vaults.create'),
          onPress: (name?: string) => {
            if (name?.trim()) dispatch(createVault({ name }))
          },
        },
      ],
      'plain-text',
    )
  }, [dispatch, t])

  const handleAction = useCallback(
    (action: VaultSheetAction) => {
      setSheetOpen(false)
      if (action === 'create') promptNewVault()
      else router.push(ROUTES[action] as never)
    },
    [promptNewVault, setSheetOpen],
  )

  const quickMenu = useMemo(
    () => [
      ...vaults
        .filter((vault) => !vault.current)
        .map((vault) => ({
          id: `${QUICK_SWITCH_PREFIX}${vault.id}`,
          title: getVaultLabel(vault, t),
          systemImage: 'square.stack.3d.up',
        })),
      { id: 'manage', title: t('vaults.manage'), systemImage: 'gearshape' },
    ],
    [t, vaults],
  )

  const handleQuickSelect = useCallback(
    (actionId: string) => {
      if (actionId === 'manage') {
        router.push(VAULTS_SETTINGS_ROUTE as never)
        return
      }
      const id = actionId.slice(QUICK_SWITCH_PREFIX.length)
      dispatch(switchVault({ id }))
    },
    [dispatch],
  )

  if (!visible) return null

  const label = getVaultLabel(currentVault, t)

  return (
    <>
      <ContextMenuView
        items={quickMenu}
        onSelect={handleQuickSelect}
        previewCornerRadius={Radii.pill}
        menuEnabled={!busy}
      >
        <Pressable
          onPress={openSheet}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t('vaults.switchTitle')}
          accessibilityValue={{ text: label }}
          accessibilityHint={t('vaults.longPressHint')}
          style={({ pressed }) => pressed && commonStyles.pressed}
        >
          <GlassView
            intensity={GlassIntensity.low}
            borderRadius={Radii.pill}
            style={styles.capsule}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getVaultInitial(label)}</Text>
            </View>
            <Text style={styles.label} numberOfLines={1}>
              {label}
            </Text>
            <SymbolIcon
              name="chevron.up.chevron.down"
              size={UI_ICON_SIZE_14}
              color={colors.textSecondary}
            />
          </GlassView>
        </Pressable>
      </ContextMenuView>
      <VaultSwitcherBottomSheet
        visible={sheetOpen}
        vaults={vaults}
        canAdd={canAdd}
        onSelectVault={handleSelectVault}
        onAction={handleAction}
        onClose={closeSheet}
      />
    </>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    capsule: {
      ...commonStyles.row,
      gap: Space.sm,
      height: UI_SIZE_40,
      maxWidth: CAPSULE_MAX_WIDTH,
      paddingLeft: Space.xs + UI_SIZE_2,
      paddingRight: Space.md,
    },
    avatar: {
      width: UI_SIZE_28,
      height: UI_SIZE_28,
      borderRadius: Radii.sm,
      ...commonStyles.centered,
      backgroundColor: theme.colors.primary,
    },
    avatarText: {
      fontFamily: FontFamily.bold,
      fontSize: FontSize.body,
      color: theme.colors.onPrimary,
    },
    label: {
      flexShrink: 1,
      fontFamily: FontFamily.semiBold,
      fontSize: FontSize.body,
      color: theme.colors.text,
    },
  })
  return styles
})
