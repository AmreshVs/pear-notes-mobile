import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_14,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_8,
} from '@/constants/commonStyles'

import type { VaultDraftView, VaultTurnView } from './useAskVaultSheet'

const BULLET_SIZE = 6

interface AskVaultDraftCardProps {
  turn: VaultTurnView
  draft: VaultDraftView
  onOpenNote: (noteKey: string) => void
}

export const AskVaultDraftCard = memo(function AskVaultDraftCard({
  turn,
  draft,
  onOpenNote,
}: AskVaultDraftCardProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const byNumber = useMemo(
    () => new Map(turn.sources.map((source) => [source.n, source])),
    [turn.sources],
  )
  return (
    <View style={styles.draft}>
      <Text style={styles.draftTitle}>{draft.title}</Text>
      {draft.items.map((item, index) => (
        <View key={`${turn.id}-item-${index}`} style={styles.draftItem}>
          <SymbolView
            name={draft.checklist ? 'circle' : 'circle.fill'}
            size={draft.checklist ? UI_ICON_SIZE_14 : BULLET_SIZE}
            tintColor={colors.textMuted}
            style={draft.checklist ? styles.draftCheck : styles.draftBullet}
          />
          <Text style={styles.draftText} selectable>
            {item.text}
            {item.citations.map((citation) => {
              const source = byNumber.get(citation.n)
              return source ? (
                <Text
                  key={`${turn.id}-${index}-${citation.n}`}
                  onPress={() => onOpenNote(source.noteKey)}
                  accessibilityRole="button"
                  accessibilityLabel={source.title || t('activity.untitledNote')}
                  style={styles.chip}
                >
                  {` ${source.n} `}
                </Text>
              ) : null
            })}
          </Text>
        </View>
      ))}
    </View>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    draft: {
      gap: UI_SIZE_6,
    },
    draftTitle: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    draftItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: UI_SIZE_8,
    },
    draftCheck: {
      marginTop: UI_SIZE_4,
    },
    draftBullet: {
      marginTop: UI_SIZE_8,
      marginHorizontal: UI_SIZE_4,
    },
    draftText: {
      ...commonStyles.flex1,
      fontSize: FontSize.body,
      lineHeight: 22,
      fontFamily: FontFamily.regular,
      color: theme.colors.text,
    },
    chip: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: theme.colors.primary,
      backgroundColor: theme.colors.controlBackground,
    },
  })
  return styles
})
