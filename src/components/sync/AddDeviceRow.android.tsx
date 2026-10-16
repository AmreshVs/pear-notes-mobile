import { memo, useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import type { AddDeviceRowProps } from '@/components/sync/addDeviceRow.types'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_20,
  UI_SIZE_16,
  UI_SIZE_24,
  UI_SIZE_48,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
}

export const AddDeviceRow = memo(function AddDeviceRow({ label, onPress }: AddDeviceRowProps) {
  const { colors } = useMD3Theme()
  const styles = useStyles()
  const ripple = useMemo(() => androidRipple(colors.onSurface), [colors.onSurface])

  return (
    <Pressable
      onPress={onPress}
      android_ripple={ripple}
      accessibilityRole="button"
      style={styles.card}
    >
      <View style={styles.icon}>
        <MaterialCommunityIcons name="plus" size={UI_ICON_SIZE_20} color={colors.primary} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  )
})

const useStyles = createThemedStylesheetWithHooks((_theme, md3) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    card: {
      ...commonStyles.row,
      overflow: 'hidden',
      borderRadius: UI_SIZE_24,
      padding: UI_SIZE_16,
      gap: UI_SIZE_16,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
    },
    icon: {
      ...commonStyles.centered,
      width: UI_SIZE_48,
      height: UI_SIZE_48,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.primary, 0.12),
    },
    label: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.primary,
    },
  })
  return styles
}, useMD3Theme)
