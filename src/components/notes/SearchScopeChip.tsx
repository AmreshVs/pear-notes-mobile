import { memo, useCallback } from 'react'
import { Pressable, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'

import { Text } from '@/components/Themed'
import { commonStyles } from '@/constants/commonStyles'

export interface SearchScopeChipStyles {
  chip: StyleProp<ViewStyle>
  chipSelected: StyleProp<ViewStyle>
  chipText: StyleProp<TextStyle>
  chipTextSelected: StyleProp<TextStyle>
}

interface SearchScopeChipProps {
  value: string
  label: string
  selected: boolean
  onChoose: (value: string) => void
  chipStyles: SearchScopeChipStyles
}

export const SearchScopeChip = memo(function SearchScopeChip({
  value,
  label,
  selected,
  onChoose,
  chipStyles,
}: SearchScopeChipProps) {
  const handlePress = useCallback(() => onChoose(value), [onChoose, value])
  const chipStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      chipStyles.chip,
      selected && chipStyles.chipSelected,
      pressed && commonStyles.pressed,
    ],
    [chipStyles, selected],
  )

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={chipStyle}
    >
      <Text
        numberOfLines={1}
        style={[chipStyles.chipText, selected && chipStyles.chipTextSelected]}
      >
        {label}
      </Text>
    </Pressable>
  )
})
