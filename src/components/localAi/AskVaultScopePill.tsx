import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_12,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_10,
  UI_SIZE_9999,
} from '@/constants/commonStyles'

const SCOPE_PILL_MAX_WIDTH = 140

interface AskVaultScopePillProps {
  scopeName: string | null | undefined
  disabled: boolean
  onToggle: () => void
}

export const AskVaultScopePill = memo(function AskVaultScopePill({
  scopeName,
  disabled,
  onToggle,
}: AskVaultScopePillProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const label = scopeName ?? t('localAi.askVault.scopeAll')
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={t('localAi.askVault.scopeLabel')}
      accessibilityValue={{ text: label }}
      style={({ pressed }) => [styles.scopePill, pressed && commonStyles.pressed]}
    >
      <Text style={styles.scopeText} numberOfLines={1}>
        {label}
      </Text>
      <SymbolView
        name="chevron.up.chevron.down"
        size={UI_ICON_SIZE_12}
        tintColor={colors.textSecondary}
        weight="semibold"
      />
    </Pressable>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    scopePill: {
      ...commonStyles.row,
      maxWidth: SCOPE_PILL_MAX_WIDTH,
      gap: UI_SIZE_4,
      paddingHorizontal: UI_SIZE_10,
      paddingVertical: UI_SIZE_6,
      borderRadius: UI_SIZE_9999,
      backgroundColor: theme.colors.controlBackground,
    },
    scopeText: {
      flexShrink: 1,
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.textSecondary,
    },
  })
  return styles
})
