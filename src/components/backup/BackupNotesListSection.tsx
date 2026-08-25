import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, Text as RNText, View as RNView } from 'react-native'
import { FadeInDown } from 'react-native-reanimated'

import { MotionView } from '@/components/MotionView'
import { type IconName, SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  Durations,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_14,
  UI_ICON_SIZE_16,
  UI_SIZE_12,
  UI_SIZE_14,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { getMediaDisplayName } from '@/lib/backupUtils'

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
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()

  const [expandedNote, setExpandedNote] = useState<string | null>(null)

  const renderMediaItem = (m: any, noteKey: string) => {
    const kind = mediaKind(m.name)
    const iconName = MEDIA_ICONS[kind] ?? 'doc.text'

    return (
      <RNView key={m.path} style={styles.mediaRow}>
        <RNView style={styles.mediaHeaderActions}>
          <SymbolIcon
            name={iconName}
            size={UI_ICON_SIZE_14}
            color={colors.textMuted}
            weight="medium"
          />
          <RNText style={styles.mediaName} numberOfLines={1}>
            {getMediaDisplayName(m.name, t('backup.syncedMedia'))}
          </RNText>
        </RNView>
        <RNView style={styles.noteHeaderActions}>
          <RNText style={styles.mediaSize}>{formatBytes(m.size)}</RNText>
          <Pressable
            onPress={() => handleDeleteMedia(noteKey, m.path)}
            hitSlop={8}
            style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
          >
            <SymbolIcon
              name="xmark"
              size={UI_ICON_SIZE_14}
              color={colors.textMuted}
              weight="medium"
            />
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
              <SymbolIcon
                name="chevron.down"
                size={UI_ICON_SIZE_16}
                color={colors.textMuted}
                weight="medium"
              />
            ) : (
              <SymbolIcon
                name="chevron.forward"
                size={UI_ICON_SIZE_16}
                color={colors.textMuted}
                weight="medium"
              />
            )}
          </RNView>
        </Pressable>
        {isExpanded && (
          <RNView>
            <RNView style={styles.mediaRow}>
              <RNView style={styles.mediaHeaderActions}>
                <SymbolIcon
                  name="pencil"
                  size={UI_ICON_SIZE_14}
                  color={colors.textMuted}
                  weight="medium"
                />
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
    <MotionView
      entering={FadeInDown.duration(Durations.slide).delay(Durations.delayReset + 20)}
      style={styles.perNoteSection}
    >
      <Text style={commonThemedStyles.settingsSectionCapSpaced}>
        {t('backup.breakdownByType').replace('BY TYPE', 'PER NOTE')}
      </Text>
      {notesStorageInfo.map(renderNoteItem)}
    </MotionView>
  )
}

const MEDIA_ICONS: Record<string, IconName> = {
  image: 'photo',
  video: 'video',
  audio: 'mic',
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
