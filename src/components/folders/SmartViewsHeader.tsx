import { memo, useMemo } from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import { commonStyles, Space, UI_ICON_SIZE_14 } from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'

import { SmartViewsHeaderProps } from './types'

const CHEVRON_OPEN_ROTATION = '90deg'

export const SmartViewsHeader = memo(function SmartViewsHeader({
  title,
  expanded,
  onToggle,
}: SmartViewsHeaderProps) {
  const { colors } = useTheme()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const accessibilityState = useMemo(() => ({ expanded }), [expanded])

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      style={({ pressed }) => [styles.header, pressed && commonStyles.pressed]}
    >
      <Text style={[commonThemedStyles.sectionCamelCase, styles.title]}>{title}</Text>
      <SymbolIcon
        name="chevron.forward"
        size={UI_ICON_SIZE_14}
        color={colors.textMuted}
        style={expanded ? styles.chevronOpen : undefined}
      />
    </Pressable>
  )
})

const useStyles = createThemedStylesheet(() => {
  const styles = StyleSheet.create({
    header: {
      ...commonStyles.rowBetween,
      marginBottom: Space.sm,
      marginHorizontal: Space.base,
    },
    title: {
      marginBottom: 0,
    },
    chevronOpen: {
      transform: [{ rotate: CHEVRON_OPEN_ROTATION }],
    },
  })
  return styles
})
