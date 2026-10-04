import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { VaultSwitcherSheet } from '@/components/folders/VaultSwitcherSheet.android'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_20,
  UI_SIZE_2,
  UI_SIZE_16,
  UI_SIZE_24,
  UI_SIZE_28,
  UI_SIZE_36,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { useVaultSwitcher } from '@/hooks/useVaultSwitcher'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import { hapticSelection } from '@/lib/haptics'
import { getVaultInitial, getVaultLabel } from '@/lib/vaultLabels'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
}

export function VaultSettingsCard() {
  const { t } = useTranslation()
  const styles = useStyles()
  const { colors } = useMD3Theme()
  const { currentVault, visible, busy, sheetOpen, setSheetOpen } = useVaultSwitcher()
  const ripple = useMemo(() => androidRipple(colors.onSurface), [colors.onSurface])

  const openSheet = useCallback(() => {
    hapticSelection()
    setSheetOpen(true)
  }, [setSheetOpen])
  const closeSheet = useCallback(() => setSheetOpen(false), [setSheetOpen])

  if (!visible) return null

  const label = getVaultLabel(currentVault, t)

  return (
    <>
      <Pressable
        onPress={openSheet}
        disabled={busy}
        android_ripple={ripple}
        accessibilityRole="button"
        accessibilityLabel={t('vaults.switchTitle')}
        accessibilityValue={{ text: label }}
        style={styles.cardRow}
      >
        <View style={styles.iconWrap}>
          <Text style={styles.initial}>{getVaultInitial(label)}</Text>
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {label}
          </Text>
          <Text style={styles.caption}>{t('vaults.switchTitle')}</Text>
        </View>
        <MaterialCommunityIcons
          name="unfold-more-horizontal"
          size={UI_ICON_SIZE_20}
          color={colors.primary}
        />
      </Pressable>
      <VaultSwitcherSheet visible={sheetOpen} onClose={closeSheet} />
    </>
  )
}

const useStyles = createThemedStylesheetWithHooks((_theme, md3) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    cardRow: {
      overflow: 'hidden',
      ...commonStyles.row,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      padding: UI_SIZE_16,
      marginBottom: UI_SIZE_24,
    },
    iconWrap: {
      width: UI_SIZE_36,
      height: UI_SIZE_36,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
      ...commonStyles.centered,
    },
    initial: {
      fontFamily: FontFamily.bold,
      fontSize: FontSize.subtitle,
      color: c.primary,
    },
    rowContent: {
      ...commonStyles.flex1,
      marginLeft: UI_SIZE_16,
    },
    rowTitle: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
    },
    caption: {
      marginTop: UI_SIZE_2,
      fontSize: FontSize.caption,
      color: c.onSurfaceVariant,
    },
  })
  return styles
}, useMD3Theme)
