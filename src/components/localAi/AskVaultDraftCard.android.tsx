import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_20,
  UI_SIZE_2,
  UI_SIZE_6,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_9999,
} from '@/constants/commonStyles'

import type { VaultDraftView, VaultTurnView } from './useAskVaultSheet'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  onSurfaceVariant?: string
}

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
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
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
          {draft.checklist ? (
            <MaterialCommunityIcons
              name="checkbox-blank-outline"
              size={UI_ICON_SIZE_20}
              color={c.onSurfaceVariant ?? c.onSurface}
              style={styles.draftCheck}
            />
          ) : (
            <View style={styles.draftBullet} />
          )}
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

const useStyles = createThemedStylesheetWithHooks((_theme, md3Theme) => {
  const c = md3Theme.colors as ExtendedColors & {
    secondaryContainer?: string
    onSecondaryContainer?: string
  }
  const styles = StyleSheet.create({
    draft: {
      gap: UI_SIZE_6,
    },
    draftTitle: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onSurface,
    },
    draftItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: UI_SIZE_8,
    },
    draftCheck: {
      marginTop: UI_SIZE_2,
    },
    draftBullet: {
      width: UI_SIZE_6,
      height: UI_SIZE_6,
      marginTop: UI_SIZE_10,
      marginHorizontal: UI_SIZE_6,
      borderRadius: UI_SIZE_9999,
      backgroundColor: c.onSurfaceVariant,
    },
    draftText: {
      ...commonStyles.flex1,
      fontSize: FontSize.body,
      lineHeight: 24,
      fontFamily: FontFamily.regular,
      color: c.onSurface,
    },
    chip: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onSecondaryContainer,
      backgroundColor: c.secondaryContainer,
    },
  })
  return styles
}, useMD3Theme)
