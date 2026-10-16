import { memo, useMemo } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_20,
  UI_SIZE_6,
  UI_SIZE_10,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'

import { SmartViewsHeaderProps } from './types'

const CHEVRON_OPEN_ROTATION = '90deg'

export const SmartViewsHeader = memo(function SmartViewsHeader({
  title,
  expanded,
  onToggle,
}: SmartViewsHeaderProps) {
  const { colors } = useMD3Theme()
  const styles = useStyles()
  const ripple = useMemo(() => androidRipple(colors.onSurface), [colors.onSurface])
  const accessibilityState = useMemo(() => ({ expanded }), [expanded])

  return (
    <Pressable
      onPress={onToggle}
      android_ripple={ripple}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      style={styles.header}
    >
      <Text style={styles.title}>{title}</Text>
      <MaterialCommunityIcons
        name="chevron-right"
        size={UI_ICON_SIZE_20}
        color={colors.onSurfaceVariant}
        style={expanded ? styles.chevronOpen : undefined}
      />
    </Pressable>
  )
})

const useStyles = createThemedStylesheetWithHooks((_theme, md3) => {
  const c = md3.colors
  const styles = StyleSheet.create({
    header: {
      ...commonStyles.rowBetween,
      overflow: 'hidden',
      marginBottom: UI_SIZE_10,
      paddingHorizontal: UI_SIZE_6,
    },
    title: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
    },
    chevronOpen: {
      transform: [{ rotate: CHEVRON_OPEN_ROTATION }],
    },
  })
  return styles
}, useMD3Theme)
