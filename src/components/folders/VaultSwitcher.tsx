import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionSheetIOS, Pressable, StyleSheet } from 'react-native'
import { useDispatch } from 'react-redux'
import { router } from 'expo-router'

import { switchVault } from '@pear-notes/core/store/slices/vaultsSlice.js'

import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useColors } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  Space,
  UI_ICON_SIZE_16,
} from '@/constants/commonStyles'
import { useVaultSwitcher, VAULTS_SETTINGS_ROUTE } from '@/hooks/useVaultSwitcher'
import { hapticSelection } from '@/lib/haptics'
import { getVaultLabel } from '@/lib/vaultLabels'

export function VaultSwitcher() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const styles = useStyles()
  const colors = useColors()
  const { vaults, currentVault, visible, busy } = useVaultSwitcher()

  const handleSelect = useCallback(
    (index: number) => {
      const vault = vaults[index]
      if (vault && !vault.current) dispatch(switchVault({ id: vault.id }))
      if (index === vaults.length) router.push(VAULTS_SETTINGS_ROUTE as never)
    },
    [dispatch, vaults],
  )

  const handleOpen = useCallback(() => {
    hapticSelection()
    const options = [
      ...vaults.map((vault) => getVaultLabel(vault, t)),
      t('vaults.manage'),
      t('common.cancel'),
    ]
    ActionSheetIOS.showActionSheetWithOptions(
      { title: t('vaults.switchTitle'), options, cancelButtonIndex: options.length - 1 },
      handleSelect,
    )
  }, [handleSelect, t, vaults])

  if (!visible) return null

  return (
    <Pressable
      onPress={handleOpen}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={t('vaults.switchTitle')}
      style={({ pressed }) => [styles.chip, pressed && commonStyles.pressed]}
    >
      <Text style={styles.label} numberOfLines={1}>
        {busy ? t('vaults.openingVault') : getVaultLabel(currentVault, t)}
      </Text>
      <SymbolIcon name="chevron.down" size={UI_ICON_SIZE_16} color={colors.primary} />
    </Pressable>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    chip: {
      ...commonStyles.row,
      alignSelf: 'flex-start',
      gap: Space.xs,
      marginBottom: Space.md,
    },
    label: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.primary,
    },
  })
  return styles
})
