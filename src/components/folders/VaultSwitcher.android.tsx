import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet } from 'react-native'
import { useDispatch } from 'react-redux'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router } from 'expo-router'

import { switchVault } from '@pear-notes/core/store/slices/vaultsSlice.js'

import { BottomActionSheet, type SheetAction } from '@/components/android/BottomActionSheet'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  UI_ICON_SIZE_20,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { useVaultSwitcher, VAULTS_SETTINGS_ROUTE } from '@/hooks/useVaultSwitcher'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import { getVaultLabel } from '@/lib/vaultLabels'

export function VaultSwitcher() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const { vaults, currentVault, visible, busy, sheetOpen, setSheetOpen } = useVaultSwitcher()

  const ripple = useMemo(() => androidRipple(md3.colors.onSurface), [md3.colors.onSurface])
  const openSheet = useCallback(() => setSheetOpen(true), [setSheetOpen])
  const closeSheet = useCallback(() => setSheetOpen(false), [setSheetOpen])

  const actions = useMemo<SheetAction[]>(
    () => [
      ...vaults.map((vault) => ({
        icon: vault.current ? 'check' : 'layers-outline',
        label: getVaultLabel(vault, t),
        selected: vault.current,
        onPress: () => {
          setSheetOpen(false)
          if (!vault.current) dispatch(switchVault({ id: vault.id }))
        },
      })),
      {
        icon: 'cog-outline',
        label: t('vaults.manage'),
        onPress: () => {
          setSheetOpen(false)
          router.push(VAULTS_SETTINGS_ROUTE as never)
        },
      },
    ],
    [dispatch, setSheetOpen, t, vaults],
  )

  if (!visible) return null

  return (
    <>
      <Pressable
        onPress={openSheet}
        disabled={busy}
        android_ripple={ripple}
        accessibilityRole="button"
        accessibilityLabel={t('vaults.switchTitle')}
        style={styles.chip}
      >
        <Text style={styles.label} numberOfLines={1}>
          {busy ? t('vaults.openingVault') : getVaultLabel(currentVault, t)}
        </Text>
        <MaterialCommunityIcons
          name="menu-down"
          size={UI_ICON_SIZE_20}
          color={md3.colors.onSecondaryContainer}
        />
      </Pressable>
      <BottomActionSheet
        visible={sheetOpen}
        onDismiss={closeSheet}
        title={t('vaults.switchTitle')}
        actions={actions}
      />
    </>
  )
}

const useSwitcherHooks = () => {
  const md3 = useMD3Theme()
  return { md3 }
}

const useStyles = createThemedStylesheetWithHooks((_theme, { md3 }) => {
  const c = md3.colors
  const styles = StyleSheet.create({
    chip: {
      ...commonStyles.row,
      alignSelf: 'flex-start',
      gap: UI_SIZE_4,
      marginTop: UI_SIZE_4,
      paddingVertical: UI_SIZE_4,
      paddingLeft: UI_SIZE_12,
      paddingRight: UI_SIZE_8,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.secondaryContainer || c.primary, 0.9),
      overflow: 'hidden',
    },
    label: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      color: c.onSecondaryContainer,
    },
  })
  return styles
}, useSwitcherHooks)
