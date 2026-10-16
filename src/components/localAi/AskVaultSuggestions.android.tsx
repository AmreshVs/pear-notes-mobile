import { memo, useCallback, useMemo } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_20,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_16,
  UI_SIZE_20,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

import type { VaultSuggestionView } from './useAskVaultSheet'

const SUGGESTION_ICONS: Record<string, string> = {
  note: 'file-document-outline',
  keyPoints: 'format-list-bulleted',
  folder: 'folder-outline',
}
const DEFAULT_SUGGESTION_ICON = 'creation'
const CARD_BASIS = '46%'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
}

interface AskVaultSuggestionsProps {
  suggestions: VaultSuggestionView[]
  onSelect: (suggestion: string) => void
}

interface SuggestionCardProps {
  suggestion: VaultSuggestionView
  onSelect: (suggestion: string) => void
}

const SuggestionCard = memo(function SuggestionCard({ suggestion, onSelect }: SuggestionCardProps) {
  const md3 = useMD3Theme()
  const c = md3.colors
  const styles = useStyles()
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const handlePress = useCallback(() => onSelect(suggestion.text), [onSelect, suggestion.text])
  return (
    <Pressable
      onPress={handlePress}
      android_ripple={ripple}
      accessibilityRole="button"
      style={styles.card}
    >
      <MaterialCommunityIcons
        name={(SUGGESTION_ICONS[suggestion.kind] ?? DEFAULT_SUGGESTION_ICON) as never}
        size={UI_ICON_SIZE_20}
        color={c.primary}
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

const useStyles = createThemedStylesheetWithHooks((theme, md3Theme) => {
  const c = md3Theme.colors as ExtendedColors
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
      overflow: 'hidden',
      padding: UI_SIZE_16,
      borderRadius: UI_SIZE_20,
      backgroundColor: c.surfaceContainerHigh ?? hexWithAlpha(c.onSurface, 0.06),
    },
    text: {
      fontSize: FontSize.body,
      lineHeight: 19,
      fontFamily: FontFamily.medium,
      fontWeight: FontWeight.medium,
      color: c.onSurface,
    },
  })
  return styles
}, useMD3Theme)
