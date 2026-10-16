import { memo } from 'react'
import { Pressable, StyleSheet, View as RNView } from 'react-native'

import { SymbolIcon } from '@/components/SymbolIcon'
import type { AddDeviceRowProps } from '@/components/sync/addDeviceRow.types'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_18,
  UI_SIZE_14,
  UI_SIZE_18,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

export const AddDeviceRow = memo(function AddDeviceRow({ label, onPress }: AddDeviceRowProps) {
  const { colors } = useTheme()
  const styles = useStyles()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && commonStyles.pressed]}
    >
      <RNView style={styles.icon}>
        <SymbolIcon name="plus" size={UI_ICON_SIZE_18} color={colors.primary} />
      </RNView>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    row: {
      ...commonStyles.row,
      gap: UI_SIZE_14,
      paddingHorizontal: UI_SIZE_18,
      paddingVertical: UI_SIZE_14,
    },
    icon: {
      ...commonStyles.centered,
      width: Space.huge,
      height: Space.huge,
      borderRadius: Radii.md,
      backgroundColor: hexWithAlpha(theme.colors.primary, theme.isDark ? 0.15 : 0.08),
    },
    label: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      color: theme.colors.primary,
    },
  })
  return styles
})
