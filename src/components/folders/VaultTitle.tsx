import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Pressable, type StyleProp, StyleSheet, type TextStyle, View } from 'react-native'
import { useDispatch } from 'react-redux'
import { router } from 'expo-router'

import { createVault, switchVault } from '@pear-notes/core/store/slices/vaultsSlice.js'

import {
  type VaultSheetAction,
  VaultSwitcherBottomSheet,
} from '@/components/bottomsheet/VaultSwitcherBottomSheet'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useColors } from '@/components/Themed'
import { commonStyles, Space, UI_ICON_SIZE_18 } from '@/constants/commonStyles'
import { JOIN_VAULT_ROUTE, useVaultSwitcher, VAULTS_SETTINGS_ROUTE } from '@/hooks/useVaultSwitcher'
import { hapticSelection } from '@/lib/haptics'
import { getVaultLabel } from '@/lib/vaultLabels'
import type { Vault } from '@/lib/vaults.types'

type Props = {
  title: string
  titleStyle: StyleProp<TextStyle>
}

const ROUTES: Record<Exclude<VaultSheetAction, 'create'>, string> = {
  join: JOIN_VAULT_ROUTE,
  manage: VAULTS_SETTINGS_ROUTE,
}

export function VaultTitle({ title, titleStyle }: Props) {
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

  if (!visible) return <Text style={titleStyle}>{title}</Text>

  return (
    <>
      <Pressable
        onPress={openSheet}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={t('vaults.switchTitle')}
        accessibilityHint={getVaultLabel(currentVault, t)}
        style={({ pressed }) => [styles.row, pressed && commonStyles.pressed]}
      >
        <Text style={[titleStyle, styles.shrink]} numberOfLines={1}>
          {getVaultLabel(currentVault, t)}
        </Text>
        <View style={styles.chevron}>
          <SymbolIcon name="chevron.down" size={UI_ICON_SIZE_18} color={colors.primary} />
        </View>
      </Pressable>
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

const useStyles = createThemedStylesheet(() => {
  const styles = StyleSheet.create({
    row: {
      ...commonStyles.row,
      maxWidth: '100%',
      gap: Space.xs,
    },
    shrink: {
      flexShrink: 1,
    },
    chevron: {
      paddingTop: Space.xs,
    },
  })
  return styles
})
