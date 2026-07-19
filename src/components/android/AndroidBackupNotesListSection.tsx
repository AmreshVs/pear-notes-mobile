import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import { commonStyles, FontFamily, FontSize, FontWeight, UI_ICON_SIZE_14, UI_ICON_SIZE_20, UI_SIZE_8, UI_SIZE_10, UI_SIZE_12, UI_SIZE_14, UI_SIZE_16, UI_SIZE_20 } from '@/constants/commonStyles'
import { getMediaDisplayName } from '@/lib/backupUtils'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  surfaceContainerHighest?: string
  outlineVariant?: string
  primaryContainer?: string
  onSurfaceVariant?: string
}

type AndroidBackupNotesListSectionProps = {
  notesStorageInfo: any[]
  formatBytes: (bytes: number) => string
  handleDeleteMedia: (noteKey: string, mediaPath: string) => void
  mediaKind: (name: string) => string
}

export function AndroidBackupNotesListSection({
  notesStorageInfo,
  formatBytes,
  handleDeleteMedia,
  mediaKind,
}: AndroidBackupNotesListSectionProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors

  const [expandedNote, setExpandedNote] = useState<string | null>(null)

  const renderMediaItem = (m: any, noteKey: string) => {
    const kind = mediaKind(m.name)
    let iconName = 'file-document-outline'
    if (kind === 'image') iconName = 'image-outline'
    else if (kind === 'video') iconName = 'video-outline'
    else if (kind === 'audio') iconName = 'microphone-outline'

    return (
      <View key={m.path} style={styles.mediaRow}>
        <View style={styles.mediaHeaderActions}>
          <MaterialCommunityIcons name={iconName as any} size={UI_ICON_SIZE_14} color={c.onSurfaceVariant} />
          <Text style={styles.mediaName} numberOfLines={1}>
            {getMediaDisplayName(m.name, t('backup.syncedMedia'))}
          </Text>
        </View>
        <View style={styles.noteHeaderActions}>
          <Text style={styles.mediaSize}>{formatBytes(m.size)}</Text>
          <Pressable
            onPress={() => handleDeleteMedia(noteKey, m.path)}
            hitSlop={8}
            style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
          >
            <MaterialCommunityIcons name="close" size={UI_ICON_SIZE_14} color={c.onSurfaceVariant} />
          </Pressable>
        </View>
      </View>
    )
  }

  const renderNoteItem = (note: any) => {
    const isExpanded = expandedNote === note.key
    return (
      <View key={note.key} style={styles.noteCard}>
        <Pressable
          onPress={() => setExpandedNote(isExpanded ? null : note.key)}
          style={({ pressed }) => [styles.noteRow, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.noteTitle} numberOfLines={1}>
            {note.title || t('noteCard.untitled')}
          </Text>
          <View style={styles.noteHeaderActions}>
            <Text style={styles.noteSize}>{formatBytes(note.totalSize)}</Text>
            <MaterialCommunityIcons
              name={isExpanded ? 'chevron-down' : 'chevron-right'}
              size={UI_ICON_SIZE_20}
              color={c.onSurfaceVariant}
            />
          </View>
        </Pressable>
        {isExpanded && (
          <View>
            <View style={styles.mediaRow}>
              <View style={styles.mediaHeaderActions}>
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={UI_ICON_SIZE_14}
                  color={c.onSurfaceVariant}
                />
                <Text style={styles.mediaName} numberOfLines={1}>
                  {t('backup.text')}
                </Text>
              </View>
              <Text style={styles.mediaSize}>{formatBytes(note.contentSize)}</Text>
              <View style={styles.mediaSpacer} />
            </View>
            {note.media?.map((m: any) => renderMediaItem(m, note.key))}
          </View>
        )}
      </View>
    )
  }

  if (notesStorageInfo.length === 0) return null

  return (
    <Animated.View entering={FadeInDown.duration(240).delay(170)} style={styles.perNoteSection}>
      <Text style={styles.sectionTitle}>
        {t('backup.breakdownByType').replace('BY TYPE', 'PER NOTE')}
      </Text>
      {notesStorageInfo.map(renderNoteItem)}
    </Animated.View>
  )
}

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
  return hex.length === 7 ? `${hex}${a}` : hex
}

const useListHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3, insets }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    perNoteSection: {
      marginTop: UI_SIZE_12,
    },
    sectionTitle: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurfaceVariant,
      marginBottom: UI_SIZE_8,
      marginLeft: UI_SIZE_8,
      letterSpacing: 0.5,
    },
    noteCard: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_20,
      marginBottom: UI_SIZE_8,
      overflow: 'hidden',
    },
    noteRow: {
      ...commonStyles.rowBetween,
      padding: UI_SIZE_16,
    },
    noteTitle: {
      flex: 1,
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
      marginRight: UI_SIZE_8,
    },
    noteHeaderActions: {
      ...commonStyles.row,
      gap: UI_SIZE_8,
    },
    noteSize: {
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
      fontFamily: FontFamily.regular,
    },
    mediaRow: {
      ...commonStyles.rowBetween,
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: hexWithAlpha(c.outlineVariant ?? theme.colors.border ?? '#38383a', 0.5),
    },
    mediaHeaderActions: {
      ...commonStyles.row,
      gap: UI_SIZE_8,
      flex: 1,
    },
    mediaName: {
      flex: 1,
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
      fontFamily: FontFamily.regular,
      marginRight: UI_SIZE_8,
    },
    mediaSize: {
      fontSize: FontSize.caption,
      color: c.onSurfaceVariant,
      fontFamily: FontFamily.regular,
    },
    mediaSpacer: {
      width: UI_SIZE_14,
      marginLeft: UI_SIZE_8,
    },
  })
  return styles
}, useListHooks)
