import { memo, useCallback, useMemo } from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import type { UpcomingFoldHeaderProps } from '@/components/upcoming/UpcomingTaskRow.types'
import {
  commonStyles,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_14,
} from '@/constants/commonStyles'

const CHEVRON_OPEN_ROTATION = '90deg'

export const UpcomingFoldHeader = memo(function UpcomingFoldHeader({
  group,
  title,
  expanded,
  onToggle,
}: UpcomingFoldHeaderProps) {
  const { colors } = useTheme()
  const styles = useStyles()
  const handlePress = useCallback(() => onToggle(group), [onToggle, group])
  const accessibilityState = useMemo(() => ({ expanded }), [expanded])

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      style={({ pressed }) => [styles.header, pressed && commonStyles.pressed]}
    >
      <Text style={styles.title}>{title}</Text>
      <SymbolIcon
        name="chevron.forward"
        size={UI_ICON_SIZE_14}
        color={colors.textMuted}
        style={expanded ? styles.chevronOpen : undefined}
      />
    </Pressable>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    header: {
      ...commonStyles.rowBetween,
      marginTop: Space.sm,
      paddingVertical: Space.md,
      paddingHorizontal: Space.base,
    },
    title: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      color: theme.colors.textMuted,
    },
    chevronOpen: {
      transform: [{ rotate: CHEVRON_OPEN_ROTATION }],
    },
  })
  return styles
})
