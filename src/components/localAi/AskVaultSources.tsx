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
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_20,
} from '@/constants/commonStyles'

import { getShownSources, type VaultTurnView } from './useAskVaultSheet'

interface AskVaultSourcesProps {
  turn: VaultTurnView
  sourceMeta: (noteKey: string) => string
  onOpenNote: (noteKey: string) => void
}

export const AskVaultSources = memo(function AskVaultSources({
  turn,
  sourceMeta,
  onOpenNote,
}: AskVaultSourcesProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const { isCited, shown } = getShownSources(turn)
  if (!shown.length) return null
  return (
    <View style={styles.sources}>
      <Text style={styles.sourcesTitle}>
        {t(isCited ? 'localAi.askVault.fromYourNotes' : 'localAi.askVault.relatedNotes')}
      </Text>
      {shown.map((source, index) => {
        const meta = sourceMeta(source.noteKey)
        return (
          <Pressable
            key={`${turn.id}-${source.n}`}
            onPress={() => onOpenNote(source.noteKey)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.sourceRow, pressed && commonStyles.pressed]}
          >
            <View style={styles.sourceNumber}>
              <Text style={styles.sourceNumberText}>{isCited ? source.n : index + 1}</Text>
            </View>
            <View style={commonStyles.flex1}>
              <Text style={styles.sourceTitle} numberOfLines={1}>
                {source.title || t('activity.untitledNote')}
              </Text>
              {!!meta && (
                <Text style={styles.sourceSnippet} numberOfLines={1}>
                  {meta}
                </Text>
              )}
            </View>
            <SymbolView
              name="chevron.right"
              size={UI_ICON_SIZE_12}
              tintColor={colors.textMuted}
              weight="semibold"
            />
          </Pressable>
        )
      })}
    </View>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    sources: {
      gap: UI_SIZE_4,
    },
    sourcesTitle: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
    },
    sourceRow: {
      ...commonStyles.row,
      gap: UI_SIZE_10,
      paddingVertical: UI_SIZE_8,
    },
    sourceNumber: {
      ...commonStyles.centered,
      width: UI_SIZE_20,
      height: UI_SIZE_20,
      borderRadius: UI_SIZE_6,
      borderCurve: 'continuous',
      backgroundColor: theme.colors.controlBackground,
    },
    sourceNumberText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: theme.colors.primary,
    },
    sourceTitle: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    sourceSnippet: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
    },
  })
  return styles
})
