import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
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
  UI_SIZE_8,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  onSurfaceVariant?: string
}

interface AskVaultSuggestionsProps {
  suggestions: string[]
  onSelect: (suggestion: string) => void
}

export const AskVaultSuggestions = memo(function AskVaultSuggestions({
  suggestions,
  onSelect,
}: AskVaultSuggestionsProps) {
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  return (
    <View style={styles.suggestions}>
      <Text style={styles.title}>{t('localAi.askVault.tryAsking')}</Text>
      {suggestions.map((suggestion) => (
        <Pressable
          key={suggestion}
          onPress={() => onSelect(suggestion)}
          android_ripple={ripple}
          accessibilityRole="button"
          style={styles.suggestionRow}
        >
          <MaterialCommunityIcons
            name="arrow-right"
            size={UI_ICON_SIZE_16}
            color={c.onSurfaceVariant ?? c.onSurface}
          />
          <Text style={styles.suggestionText} numberOfLines={1}>
            {suggestion}
          </Text>
        </Pressable>
      ))}
    </View>
  )
})

const useStyles = createThemedStylesheetWithHooks((_theme, md3Theme) => {
  const c = md3Theme.colors as ExtendedColors
  const styles = StyleSheet.create({
    suggestions: {
      gap: UI_SIZE_2,
    },
    title: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onSurfaceVariant,
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
      color: c.onSurfaceVariant,
    },
  })
  return styles
}, useMD3Theme)
