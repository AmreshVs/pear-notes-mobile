import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'

import { VaultSwitcherBottomSheet } from '@/components/bottomsheet/VaultSwitcherBottomSheet'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useColors } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_16,
  UI_SIZE_2,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { useVaultSheetControls } from '@/hooks/useVaultSheetControls'
import { getVaultInitial, getVaultLabel } from '@/lib/vaultLabels'

export function VaultSettingsCard() {
  const { t } = useTranslation()
  const styles = useStyles()
  const colors = useColors()
  const commonThemedStyles = useCommonThemedStyles()
  const {
    vaults,
    currentVault,
    visible,
    busy,
    sheetOpen,
    openSheet,
    closeSheet,
    handleSelectVault,
    handleManage,
  } = useVaultSheetControls()

  if (!visible) return null

  const label = getVaultLabel(currentVault, t)

  return (
    <>
      <View style={commonThemedStyles.card}>
        <Pressable
          onPress={openSheet}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t('vaults.switchTitle')}
          accessibilityValue={{ text: label }}
          style={({ pressed }) => [commonStyles.settingsRow, pressed && commonStyles.pressed]}
        >
          <View style={[commonStyles.settingsRowLeft, commonStyles.flex1]}>
            <View style={commonThemedStyles.iconBox34}>
              <Text style={styles.initial}>{getVaultInitial(label)}</Text>
            </View>
            <View style={commonStyles.flex1}>
              <Text style={styles.name} numberOfLines={1}>
                {label}
              </Text>
              <Text style={styles.caption}>{t('vaults.switchTitle')}</Text>
            </View>
          </View>
          <SymbolIcon
            name="chevron.up.chevron.down"
            size={UI_ICON_SIZE_16}
            color={colors.textMuted}
          />
        </Pressable>
      </View>
      <VaultSwitcherBottomSheet
        visible={sheetOpen}
        vaults={vaults}
        onSelectVault={handleSelectVault}
        onManage={handleManage}
        onClose={closeSheet}
      />
    </>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    initial: {
      fontFamily: FontFamily.bold,
      fontSize: FontSize.subtitle,
      color: theme.colors.primary,
    },
    name: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    caption: {
      marginTop: UI_SIZE_2,
      fontSize: FontSize.caption,
      color: theme.colors.textSecondary,
    },
  })
  return styles
})
