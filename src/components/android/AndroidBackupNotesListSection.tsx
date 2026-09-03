import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { MotionView } from '@/components/MotionView'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import { commonStyles, FontFamily, FontSize, FontWeight, UI_ICON_SIZE_14, UI_ICON_SIZE_20, UI_SIZE_8, UI_SIZE_10, UI_SIZE_12, UI_SIZE_14, UI_SIZE_16, UI_SIZE_20 } from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { getMediaDisplayName,hexWithAlpha  } from '@/lib/backupUtils'

import { useMD3CommonStyles } from './useMD3CommonStyles'

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
  const md3CommonStyles = useMD3CommonStyles()
  const c = md3.colors as ExtendedColors
  const rippleBorderless = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])

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
            android_ripple={rippleBorderless}
            hitSlop={UI_SIZE_8}
            
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
          android_ripple={ripple}
          style={styles.noteRow}
        >
          <View style={styles.noteTitleGroup}>
            <Text style={styles.noteTitle} numberOfLines={1}>
              {note.title || t('noteCard.untitled')}
            </Text>
            {!note.title && !!note.subtitle && (
              <Text style={styles.noteSubtitle} numberOfLines={1}>
                {note.subtitle}
              </Text>
            )}
          </View>
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
    <MotionView entering={FadeInDown.duration(240).delay(170)} style={styles.perNoteSection}>
      <Text style={md3CommonStyles.settingsSectionCamelCase}>
        {t('backup.breakdownByType').replace('BY TYPE', 'PER NOTE')}
      </Text>
      {notesStorageInfo.map(renderNoteItem)}
    </MotionView>
  )
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
    noteTitleGroup: {
      flex: 1,
      marginRight: UI_SIZE_8,
    },
    noteTitle: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.medium,
      fontFamily: FontFamily.medium,
      color: c.onSurface,
    },
    noteSubtitle: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.medium,
      fontFamily: FontFamily.medium,
      color: c.onSurfaceVariant,
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
      borderTopWidth: StyleSheet.hairlineWidth,
      ...commonStyles.rowBetween,
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_10,
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
