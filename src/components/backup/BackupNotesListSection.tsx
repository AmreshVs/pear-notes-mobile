import {
  ChevronDown,
  ChevronRight,
  FileText,
  Film,
  Image as ImageIcon,
  Mic,
  PenLine,
  X,
} from 'lucide-react-native'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, Text as RNText, View as RNView, StyleSheet } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  Durations,
  FontSize,
  FontWeight,
  LetterSpacing,
  Space,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_16,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'

type BackupNotesListSectionProps = {
  notesStorageInfo: any[]
  formatBytes: (bytes: number) => string
  handleDeleteMedia: (noteKey: string, mediaPath: string) => void
  mediaKind: (name: string) => string
}

export function BackupNotesListSection({
  notesStorageInfo,
  formatBytes,
  handleDeleteMedia,
  mediaKind,
}: BackupNotesListSectionProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const { colors } = theme
  const styles = useStyles() as any
  const commonThemedStyles = useCommonThemedStyles()

  const [expandedNote, setExpandedNote] = useState<string | null>(null)

  const renderMediaItem = (m: any, noteKey: string) => {
    const kind = mediaKind(m.name)
    let Icon = FileText
    if (kind === 'image') Icon = ImageIcon
    else if (kind === 'video') Icon = Film
    else if (kind === 'audio') Icon = Mic

    return (
      <RNView key={m.path} style={styles.mediaRow}>
        <RNView style={styles.mediaHeaderActions}>
          <Icon size={UI_SIZE_14} color={colors.textMuted} strokeWidth={2} />
          <RNText style={styles.mediaName} numberOfLines={1}>
            {m.name}
          </RNText>
        </RNView>
        <RNView style={styles.noteHeaderActions}>
          <RNText style={styles.mediaSize}>{formatBytes(m.size)}</RNText>
          <Pressable
            onPress={() => handleDeleteMedia(noteKey, m.path)}
            hitSlop={8}
            style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
          >
            <X size={UI_SIZE_14} color={colors.textMuted} strokeWidth={2} />
          </Pressable>
        </RNView>
      </RNView>
    )
  }

  const renderNoteItem = (note: any) => {
    const isExpanded = expandedNote === note.key
    return (
      <RNView key={note.key} style={[commonThemedStyles.card, styles.noteCard]}>
        <Pressable
          onPress={() => setExpandedNote(isExpanded ? null : note.key)}
          style={({ pressed }) => [styles.noteRow, pressed && { opacity: 0.7 }]}
        >
          <RNText style={styles.noteTitle} numberOfLines={1}>
            {note.title || t('noteCard.untitled')}
          </RNText>
          <RNView style={styles.noteHeaderActions}>
            <RNText style={styles.noteSize}>{formatBytes(note.totalSize)}</RNText>
            {isExpanded ? (
              <ChevronDown size={UI_SIZE_16} color={colors.textMuted} strokeWidth={2} />
            ) : (
              <ChevronRight size={UI_SIZE_16} color={colors.textMuted} strokeWidth={2} />
            )}
          </RNView>
        </Pressable>
        {isExpanded && (
          <RNView>
            <RNView style={styles.mediaRow}>
              <RNView style={styles.mediaHeaderActions}>
                <PenLine size={UI_SIZE_14} color={colors.textMuted} strokeWidth={2} />
                <RNText style={styles.mediaName} numberOfLines={1}>
                  {t('backup.text')}
                </RNText>
              </RNView>
              <RNText style={styles.mediaSize}>{formatBytes(note.contentSize)}</RNText>
              <RNView style={styles.mediaSpacer} />
            </RNView>
            {note.media?.map((m: any) => renderMediaItem(m, note.key))}
          </RNView>
        )}
      </RNView>
    )
  }

  if (notesStorageInfo.length === 0) return null

  return (
    <Animated.View
      entering={FadeInDown.duration(Durations.slide).delay(Durations.delayReset + 20)}
      style={styles.perNoteSection}
    >
      <Text style={styles.sectionCapMargin}>
        {t('backup.breakdownByType').replace('BY TYPE', 'PER NOTE')}
      </Text>
      {notesStorageInfo.map(renderNoteItem)}
    </Animated.View>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    perNoteSection: {
      marginTop: UI_SIZE_12,
    },
    noteCard: {
      marginBottom: Space.sm,
    },
    mediaSpacer: {
      width: UI_SIZE_14,
      marginLeft: Space.sm,
    },
    sectionCapMargin: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      letterSpacing: LetterSpacing.caps,
      marginBottom: Space.md,
      textTransform: 'uppercase',
      color: theme.colors.textMuted,
    },
    noteRow: {
      ...commonStyles.rowBetween,
      padding: Space.base,
    },
    noteTitle: {
      flex: 1,
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
      marginRight: Space.md,
    },
    noteHeaderActions: {
      ...commonStyles.row,
      gap: Space.sm,
    },
    noteSize: {
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
    },
    mediaRow: {
      ...commonStyles.rowBetween,
      paddingHorizontal: Space.base,
      paddingVertical: Space.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.borderSecondary,
    },
    mediaHeaderActions: {
      ...commonStyles.row,
      gap: Space.sm,
      flex: 1,
    },
    mediaName: {
      flex: 1,
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
      marginRight: Space.md,
    },
    mediaSize: {
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
    },
  })
  return styles
})
