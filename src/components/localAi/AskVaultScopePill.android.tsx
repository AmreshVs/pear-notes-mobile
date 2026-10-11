import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_16,
  UI_SIZE_2,
  UI_SIZE_6,
  UI_SIZE_12,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'

const SCOPE_PILL_MAX_WIDTH = 140

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  onSurfaceVariant?: string
}

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
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      android_ripple={ripple}
      accessibilityRole="button"
      accessibilityLabel={t('localAi.askVault.scopeLabel')}
      accessibilityState={{ disabled }}
      style={[styles.scopePill, disabled && commonStyles.disabled]}
    >
      <Text style={styles.scopeText} numberOfLines={1}>
        {scopeName ?? t('localAi.askVault.scopeAll')}
      </Text>
      <MaterialCommunityIcons
        name="menu-down"
        size={UI_ICON_SIZE_16}
        color={c.onSurfaceVariant ?? c.onSurface}
      />
    </Pressable>
  )
})

const useStyles = createThemedStylesheetWithHooks((_theme, md3Theme) => {
  const c = md3Theme.colors
  const styles = StyleSheet.create({
    scopePill: {
      ...commonStyles.row,
      maxWidth: SCOPE_PILL_MAX_WIDTH,
      gap: UI_SIZE_2,
      overflow: 'hidden',
      paddingLeft: UI_SIZE_12,
      paddingRight: UI_SIZE_6,
      paddingVertical: UI_SIZE_6,
      borderRadius: UI_SIZE_9999,
      backgroundColor: c.secondaryContainer,
    },
    scopeText: {
      flexShrink: 1,
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSecondaryContainer,
    },
  })
  return styles
}, useMD3Theme)
