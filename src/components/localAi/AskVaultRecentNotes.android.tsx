import { memo, useCallback, useMemo } from 'react'
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
  UI_ICON_SIZE_20,
  UI_SIZE_2,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

import type { RecentNoteView } from './useAskVaultSheet'

const MUTED_FILL_ALPHA = 0.06
const DIVIDER_ALPHA = 0.12

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  onSurfaceVariant?: string
}

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
  const c = useMD3Theme().colors as ExtendedColors
  const styles = useStyles()
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const handlePress = useCallback(() => onSelect(note), [note, onSelect])
  return (
    <Pressable
      onPress={handlePress}
      android_ripple={ripple}
      accessibilityRole="button"
      style={[styles.row, !last && styles.rowDivider]}
    >
      <MaterialCommunityIcons
        name="file-document-outline"
        size={UI_ICON_SIZE_20}
        color={c.primary}
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
      <MaterialCommunityIcons
        name="chevron-right"
        size={UI_ICON_SIZE_20}
        color={c.onSurfaceVariant ?? c.onSurface}
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
      <View style={styles.card}>{notes.map(renderRow)}</View>
    </View>
  )
})

const useStyles = createThemedStylesheetWithHooks((theme, md3Theme) => {
  const c = md3Theme.colors as ExtendedColors
  const styles = StyleSheet.create({
    section: {
      gap: UI_SIZE_8,
    },
    heading: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onSurfaceVariant ?? c.onSurface,
    },
    card: {
      overflow: 'hidden',
      borderRadius: UI_SIZE_20,
      backgroundColor: c.surfaceContainerHigh ?? hexWithAlpha(c.onSurface, MUTED_FILL_ALPHA),
    },
    row: {
      ...commonStyles.row,
      gap: UI_SIZE_12,
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_12,
    },
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: hexWithAlpha(c.onSurface, DIVIDER_ALPHA),
    },
    texts: {
      ...commonStyles.flex1,
      gap: UI_SIZE_2,
    },
    title: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.medium,
      fontWeight: FontWeight.medium,
      color: c.onSurface,
    },
    meta: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant ?? c.onSurface,
    },
  })
  return styles
}, useMD3Theme)
