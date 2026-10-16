import { memo, useCallback } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { type SFSymbol, SymbolView } from 'expo-symbols'

import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  UI_ICON_SIZE_16,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_14,
} from '@/constants/commonStyles'

import type { VaultSuggestionView } from './useAskVaultSheet'

const SUGGESTION_SYMBOLS: Record<string, SFSymbol> = {
  note: 'doc.text',
  keyPoints: 'list.bullet',
  folder: 'folder',
}
const DEFAULT_SUGGESTION_SYMBOL: SFSymbol = 'sparkles'
const CARD_BASIS = '46%'

interface AskVaultSuggestionsProps {
  suggestions: VaultSuggestionView[]
  onSelect: (suggestion: string) => void
}

interface SuggestionCardProps {
  suggestion: VaultSuggestionView
  onSelect: (suggestion: string) => void
}

const SuggestionCard = memo(function SuggestionCard({ suggestion, onSelect }: SuggestionCardProps) {
  const { colors } = useTheme()
  const styles = useStyles()
  const handlePress = useCallback(() => onSelect(suggestion.text), [onSelect, suggestion.text])
  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && commonStyles.pressed]}
    >
      <SymbolView
        name={SUGGESTION_SYMBOLS[suggestion.kind] ?? DEFAULT_SUGGESTION_SYMBOL}
        size={UI_ICON_SIZE_16}
        tintColor={colors.primary}
        weight="semibold"
      />
      <Text style={styles.text} numberOfLines={3}>
        {suggestion.text}
      </Text>
    </Pressable>
  )
})

export const AskVaultSuggestions = memo(function AskVaultSuggestions({
  suggestions,
  onSelect,
}: AskVaultSuggestionsProps) {
  const styles = useStyles()
  const renderCard = useCallback(
    (suggestion: VaultSuggestionView) => (
      <SuggestionCard key={suggestion.text} suggestion={suggestion} onSelect={onSelect} />
    ),
    [onSelect],
  )
  return <View style={styles.grid}>{suggestions.map(renderCard)}</View>
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: UI_SIZE_10,
    },
    card: {
      flexGrow: 1,
      flexBasis: CARD_BASIS,
      gap: UI_SIZE_8,
      padding: UI_SIZE_14,
      borderRadius: Radii.card,
      borderCurve: 'continuous',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.borderSecondary,
      backgroundColor: theme.colors.cardSurface,
    },
    text: {
      fontSize: FontSize.body,
      lineHeight: 19,
      fontFamily: FontFamily.medium,
      fontWeight: FontWeight.medium,
      color: theme.colors.text,
    },
  })
  return styles
})
