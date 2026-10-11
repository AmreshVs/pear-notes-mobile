import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_12,
  UI_SIZE_2,
  UI_SIZE_8,
} from '@/constants/commonStyles'

interface AskVaultSuggestionsProps {
  suggestions: string[]
  onSelect: (suggestion: string) => void
}

export const AskVaultSuggestions = memo(function AskVaultSuggestions({
  suggestions,
  onSelect,
}: AskVaultSuggestionsProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  return (
    <View style={styles.suggestions}>
      <Text style={styles.title}>{t('localAi.askVault.tryAsking')}</Text>
      {suggestions.map((suggestion) => (
        <Pressable
          key={suggestion}
          onPress={() => onSelect(suggestion)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.suggestionRow, pressed && commonStyles.pressed]}
        >
          <SymbolView
            name="arrow.right"
            size={UI_ICON_SIZE_12}
            tintColor={colors.textMuted}
            weight="semibold"
          />
          <Text style={styles.suggestionText} numberOfLines={1}>
            {suggestion}
          </Text>
        </Pressable>
      ))}
    </View>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    suggestions: {
      gap: UI_SIZE_2,
    },
    title: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
    },
    suggestionRow: {
      ...commonStyles.row,
      gap: UI_SIZE_8,
      paddingVertical: UI_SIZE_8,
    },
    suggestionText: {
      ...commonStyles.flex1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.textSecondary,
    },
  })
  return styles
})
