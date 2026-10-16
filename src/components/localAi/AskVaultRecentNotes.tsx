import { memo, useCallback } from 'react'
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
  UI_ICON_SIZE_16,
  UI_SIZE_2,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_14,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'

import type { RecentNoteView } from './useAskVaultSheet'

interface AskVaultRecentNotesProps {
  notes: RecentNoteView[]
  metaOf: (noteKey: string) => string
  onSelect: (note: RecentNoteView) => void
}

interface RecentNoteRowProps {
  note: RecentNoteView
  meta: string
  last: boolean
  onSelect: (note: RecentNoteView) => void
}

const RecentNoteRow = memo(function RecentNoteRow({
  note,
  meta,
  last,
  onSelect,
}: RecentNoteRowProps) {
  const { colors } = useTheme()
  const styles = useStyles()
  const handlePress = useCallback(() => onSelect(note), [note, onSelect])
  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        !last && styles.rowDivider,
        pressed && commonStyles.pressed,
      ]}
    >
      <SymbolView
        name="doc.text"
        size={UI_ICON_SIZE_16}
        tintColor={colors.primary}
        weight="semibold"
      />
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={1}>
          {note.title}
        </Text>
        {!!meta && (
          <Text style={styles.meta} numberOfLines={1}>
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
})

export const AskVaultRecentNotes = memo(function AskVaultRecentNotes({
  notes,
  metaOf,
  onSelect,
}: AskVaultRecentNotesProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const renderRow = useCallback(
    (note: RecentNoteView, index: number) => (
      <RecentNoteRow
        key={note.key}
        note={note}
        meta={metaOf(note.key)}
        last={index === notes.length - 1}
        onSelect={onSelect}
      />
    ),
    [metaOf, notes.length, onSelect],
  )
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{t('localAi.askVault.recentNotes')}</Text>
      <View style={[commonThemedStyles.card, styles.card]}>{notes.map(renderRow)}</View>
    </View>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    section: {
      gap: UI_SIZE_8,
    },
    heading: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: theme.colors.textMuted,
    },
    card: {
      borderWidth: StyleSheet.hairlineWidth,
    },
    row: {
      ...commonStyles.row,
      gap: UI_SIZE_12,
      paddingHorizontal: UI_SIZE_14,
      paddingVertical: UI_SIZE_12,
    },
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.borderSecondary,
    },
    texts: {
      ...commonStyles.flex1,
      gap: UI_SIZE_2,
    },
    title: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.medium,
      fontWeight: FontWeight.medium,
      color: theme.colors.text,
    },
    meta: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.textSecondary,
    },
  })
  return styles
})
