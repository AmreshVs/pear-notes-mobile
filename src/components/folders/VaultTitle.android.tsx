import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, type StyleProp, StyleSheet, type TextStyle } from 'react-native'
import { useDispatch } from 'react-redux'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router } from 'expo-router'

import { createVault, switchVault } from '@pear-notes/core/store/slices/vaultsSlice.js'

import { BottomActionSheet, type SheetAction } from '@/components/android/BottomActionSheet'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { VaultNameDialog } from '@/components/android/VaultNameDialog'
import { createThemedStylesheet, Text } from '@/components/Themed'
import { commonStyles, UI_ICON_SIZE_24, UI_SIZE_4 } from '@/constants/commonStyles'
import { JOIN_VAULT_ROUTE, useVaultSwitcher, VAULTS_SETTINGS_ROUTE } from '@/hooks/useVaultSwitcher'
import { getVaultLabel } from '@/lib/vaultLabels'

type Props = {
  title: string
  titleStyle: StyleProp<TextStyle>
}

export function VaultTitle({ title, titleStyle }: Props) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const { vaults, currentVault, visible, busy, canAdd, sheetOpen, setSheetOpen } =
    useVaultSwitcher()
  const [namingVault, setNamingVault] = useState(false)

  const openSheet = useCallback(() => setSheetOpen(true), [setSheetOpen])
  const closeSheet = useCallback(() => setSheetOpen(false), [setSheetOpen])
  const closeNameDialog = useCallback(() => setNamingVault(false), [])

  const submitNewVault = useCallback(
    (name: string) => {
      setNamingVault(false)
      if (name.trim()) dispatch(createVault({ name }))
    },
    [dispatch],
  )

  const actions = useMemo<SheetAction[]>(() => {
    const close = (task: () => void) => () => {
      setSheetOpen(false)
      task()
    }
    return [
      ...vaults.map((vault) => ({
        icon: vault.current ? 'check' : 'layers-outline',
        label: getVaultLabel(vault, t),
        selected: vault.current,
        onPress: close(() => {
          if (!vault.current) dispatch(switchVault({ id: vault.id }))
        }),
      })),
      ...(canAdd
        ? [
            {
              icon: 'plus',
              label: t('vaults.newVault'),
              onPress: close(() => setNamingVault(true)),
            },
            {
              icon: 'qrcode-scan',
              label: t('vaults.join.sectionTitle'),
              onPress: close(() => router.push(JOIN_VAULT_ROUTE as never)),
            },
          ]
        : []),
      {
        icon: 'cog-outline',
        label: t('vaults.manage'),
        onPress: close(() => router.push(VAULTS_SETTINGS_ROUTE as never)),
      },
    ]
  }, [canAdd, dispatch, setSheetOpen, t, vaults])

  if (!visible) return <Text style={titleStyle}>{title}</Text>

  return (
    <>
      <Pressable
        onPress={openSheet}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={t('vaults.switchTitle')}
        accessibilityHint={getVaultLabel(currentVault, t)}
        style={styles.row}
      >
        <Text style={[titleStyle, styles.shrink]} numberOfLines={1}>
          {getVaultLabel(currentVault, t)}
        </Text>
        <MaterialCommunityIcons
          name="menu-down"
          size={UI_ICON_SIZE_24}
          color={md3.colors.onSurface}
        />
      </Pressable>
      <BottomActionSheet
        visible={sheetOpen}
        onDismiss={closeSheet}
        title={t('vaults.title')}
        actions={actions}
      />
      <VaultNameDialog
        visible={namingVault}
        title={t('vaults.newVault')}
        confirmLabel={t('vaults.create')}
        initialName=""
        onCancel={closeNameDialog}
        onConfirm={submitNewVault}
      />
    </>
  )
}

const useStyles = createThemedStylesheet(() => {
  const styles = StyleSheet.create({
    row: {
      ...commonStyles.row,
      maxWidth: '100%',
      gap: UI_SIZE_4,
    },
    shrink: {
      flexShrink: 1,
    },
  })
  return styles
})
