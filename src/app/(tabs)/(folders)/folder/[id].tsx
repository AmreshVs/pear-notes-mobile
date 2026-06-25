import { ALL_NOTES_KEY, RECENTLY_DELETED_KEY } from '@pear-notes/core/constant.js'
import {
  deleteFolder,
  getFolders,
  setSelectedFolder,
  updateFolder,
} from '@pear-notes/core/store/slices/foldersSlice.js'
import {
  createNote,
  deleteNote,
  getFilteredNotes,
  getSelectedNote,
  setSelectedNote,
  updateNote,
} from '@pear-notes/core/store/slices/notesSlice.js'
import { getLocalPreferences } from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import { setShowPairingInput } from '@pear-notes/core/store/slices/syncSlice.js'
import { getSearchQuery, setSearchQuery } from '@pear-notes/core/store/slices/uiSlice.js'
import { formatDate } from '@pear-notes/core/utils.js'
import * as Clipboard from 'expo-clipboard'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { NoteCard } from '@/components/NoteCard'
import { Text, Theme, View, useTheme, useThemedStyles } from '@/components/Themed'
import { FontSize, FontWeight, LetterSpacing, Space, commonStyles } from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { useNoteEditor } from '@/providers/NoteEditorContext'

// Replace HTML tags with a space so words don't run together, then normalize whitespace
const getPreview = (html: string, fallback: string): string => {
  if (!html) return fallback
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 100 ? text.substring(0, 100) + '…' : text || fallback
}

const getFirstImageUrl = (html: string): string | undefined => {
  if (!html) return undefined

  const divMatch =
    html.match(/<div[^>]*filetype="image\/[^"]*"[^>]*url="([^"]+)"[^>]*>/) ||
    html.match(/<div[^>]*url="([^"]+)"[^>]*filetype="image\/[^"]*"[^>]*>/)
  if (divMatch?.[1]) {
    return divMatch[1].replace(/&amp;/g, '&')
  }

  const imgMatch = html.match(/<img[^>]+src="([^"]+)"/)
  if (imgMatch?.[1]) {
    return imgMatch[1].replace(/&amp;/g, '&')
  }
  return undefined
}
export default function FolderNotesScreen() {
  const { height } = useWindowDimensions()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const theme = useTheme()
  const { colors, isDark } = theme
  const styles = useThemedStyles(createStyles)
  const commonThemedStyles = useCommonThemedStyles()
  const dispatch = useDispatch()
  const { openNote } = useNoteEditor()
  const allFolders = useSelector(getFolders)
  const notes = useSelector(getFilteredNotes)
  const searchQuery = useSelector(getSearchQuery) as string
  const selectedNote = useSelector(getSelectedNote)
  const localPreferences = useSelector(getLocalPreferences)
  const creatingNoteRef = useRef(false)
  const lastSelectedNoteRef = useRef<string | null>(selectedNote || null)

  const handleLinkDevice = useCallback(() => {
    dispatch(setShowPairingInput(true))
  }, [dispatch])

  const folder = useMemo(
    () => allFolders.find((f: any) => f.id === id || f.key === id),
    [allFolders, id],
  )

  const moveFolders = useMemo(
    () => allFolders.filter((f: any) => !f.isTrash && f.id !== ALL_NOTES_KEY && f.id !== id),
    [allFolders, id],
  )

  const groupedNotes = useMemo(() => {
    const sections: Record<string, any[]> = {
      [t('folderView.sections.today')]: [],
      [t('folderView.sections.yesterday')]: [],
      [t('folderView.sections.last7Days')]: [],
      [t('folderView.sections.older')]: [],
    }
    const now = Date.now()
    const DAY = 86_400_000

    notes.forEach((note: any) => {
      const diff = now - (note.value?.updatedAt || note.value?.createdAt || 0)
      if (diff < DAY) sections[t('folderView.sections.today')].push(note)
      else if (diff < 2 * DAY) sections[t('folderView.sections.yesterday')].push(note)
      else if (diff < 7 * DAY) sections[t('folderView.sections.last7Days')].push(note)
      else sections[t('folderView.sections.older')].push(note)
    })

    return Object.entries(sections)
      .filter(([_, data]) => data.length > 0)
      .map(([title, data]) => ({ title, data }))
  }, [notes, t])

  const handleSelectNote = useCallback(
    (noteId: string) => {
      dispatch(setSelectedNote(noteId as any))
      openNote(noteId)
    },
    [dispatch, openNote],
  )

  const handleCreateNote = useCallback(() => {
    creatingNoteRef.current = true
    dispatch(setSelectedFolder(id as any))
    dispatch(createNote({ title: '', note: '' } as any))
  }, [dispatch, id])

  const handleDeleteNote = useCallback(
    (noteId: string) => {
      const isTrash = id === RECENTLY_DELETED_KEY
      if (isTrash) {
        Alert.alert(
          t('folderView.permanentlyDeleteTitle'),
          t('folderView.permanentlyDeleteSubtitle'),
          [
            { text: t('folders.buttons.cancel'), style: 'cancel' },
            {
              text: t('folders.buttons.delete'),
              style: 'destructive',
              onPress: () => dispatch(deleteNote(noteId as any)),
            },
          ],
        )
      } else {
        dispatch(deleteNote(noteId as any))
      }
    },
    [dispatch, id],
  )

  const handleMoveNote = useCallback(
    (noteId: string, folderId: string) => {
      dispatch(updateNote({ key: noteId, folderKey: folderId } as any))
    },
    [dispatch],
  )

  const handleCopyNote = useCallback(
    async (title: string, html: string) => {
      const plain = [title, getPreview(html, t('folderView.noAdditionalText'))]
        .filter(Boolean)
        .join('\n\n')
      await Clipboard.setStringAsync(plain)
    },
    [t],
  )

  const handleRenameFolder = useCallback(() => {
    if (!folder) return
    Alert.prompt(
      t('folders.renameTitle'),
      undefined,
      (newName) => {
        const trimmed = newName?.trim()
        if (trimmed && trimmed !== folder.name) {
          dispatch(updateFolder({ id, name: trimmed } as any))
        }
      },
      'plain-text',
      folder.name,
    )
  }, [dispatch, folder, id, t])

  const handleDeleteFolder = useCallback(() => {
    Alert.alert(t('folders.deleteTitle'), t('folders.deleteDescription'), [
      { text: t('folders.buttons.cancel'), style: 'cancel' },
      {
        text: t('folders.buttons.delete'),
        style: 'destructive',
        onPress: () => {
          dispatch(deleteFolder(id as any))
          router.back()
        },
      },
    ])
  }, [dispatch, id, t])

  useEffect(() => {
    if (creatingNoteRef.current && selectedNote && selectedNote !== lastSelectedNoteRef.current) {
      creatingNoteRef.current = false
      lastSelectedNoteRef.current = selectedNote
      openNote(selectedNote)
    }
  }, [selectedNote, openNote])

  useEffect(() => {
    if (selectedNote) {
      lastSelectedNoteRef.current = selectedNote
    }
  }, [selectedNote])

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: '',
          headerLargeTitle: false,
          headerTransparent: true,
          headerBlurEffect: isDark ? 'dark' : 'light',
          headerSearchBarOptions: {
            placeholder: t('folderView.searchPlaceholder'),
            hideWhenScrolling: false,
            textColor: colors.text,
            hintTextColor: colors.textSecondary,
            headerIconColor: colors.textSecondary,
            onChangeText: (event) => {
              dispatch(setSearchQuery(event.nativeEvent.text))
            },
          },
        }}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="square.and.pencil" onPress={handleCreateNote} />
        {!folder?.isSystem && (
          <Stack.Toolbar.Menu icon="ellipsis">
            <Stack.Toolbar.MenuAction icon="pencil" onPress={handleRenameFolder}>
              {t('folders.buttons.rename')}
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction icon="trash" destructive onPress={handleDeleteFolder}>
              {t('folders.buttons.delete')}
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        )}
      </Stack.Toolbar>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: groupedNotes.length > 0 ? Space.scrollBottom : Space.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>{folder?.name || t('folders.title')}</Text>
        <View style={styles.headerInfo}>
          <Text style={commonThemedStyles.sectionCap}>
            {t('folderView.noteCount', { count: notes.length })}
          </Text>
        </View>

        {groupedNotes.length === 0 ? (
          <View style={[styles.emptyStateWrapper, { marginTop: height * 0.18 }]}>
            {searchQuery.trim().length > 0 ? (
              <>
                <Text style={commonThemedStyles.emptyTitle}>No matches found</Text>
                <Text style={commonThemedStyles.emptySubtitle}>Try a different search term</Text>
              </>
            ) : (
              <>
                <Text style={commonThemedStyles.emptyTitle}>No Notes</Text>
                <Text style={commonThemedStyles.emptySubtitle}>Tap the compose button to create one</Text>
                {localPreferences['isSynced'] !== true && (
                  <View style={styles.linkContainer}>
                    <View style={styles.linkDivider} />
                    <Text style={styles.linkTitle}>{t('folderView.empty.linkTitle')}</Text>
                    <Text style={styles.linkSub}>{t('folderView.empty.linkSub')}</Text>
                    <Pressable
                      onPress={handleLinkDevice}
                      style={({ pressed }) => [
                        commonStyles.primaryBtn,
                        { backgroundColor: colors.primary, width: '100%', marginTop: Space.xl },
                        pressed && commonStyles.pressed,
                      ]}
                    >
                      <Text style={styles.linkBtnText}>{t('folderView.empty.connectBtn')}</Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}
          </View>
        ) : (
          groupedNotes.map((section, sectionIndex) => (
            <View key={section.title} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={commonThemedStyles.sectionCap}>{section.title}</Text>
              </View>
              <View style={styles.listContainer}>
                {section.data.map((note, index) => (
                  <NoteCard
                    key={note.key}
                    id={note.key}
                    title={note.value?.title}
                    date={formatDate(note.value?.updatedAt || note.value?.createdAt)}
                    summary={getPreview(note.value?.note, t('folderView.noAdditionalText'))}
                    rawImageUrl={getFirstImageUrl(note.value?.note)}
                    folderName={
                      folder?.id === ALL_NOTES_KEY
                        ? allFolders.find((f: any) => f.id === note.value?.folderKey)?.name
                        : undefined
                    }
                    selected={false}
                    isLast={index === section.data.length - 1}
                    animationIndex={sectionIndex * 3 + index}
                    onPress={() => handleSelectNote(note.key)}
                    onDelete={() => handleDeleteNote(note.key)}
                    onCopy={() => handleCopyNote(note.value?.title, note.value?.note)}
                    moveFolders={moveFolders}
                    onMoveTo={(folderId) => handleMoveNote(note.key, folderId)}
                  />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 0,
      paddingTop: Space.lg,
    },
    pageTitle: {
      fontSize: FontSize.hero,
      lineHeight: 42,
      fontWeight: FontWeight.heavy,
      letterSpacing: LetterSpacing.tight,
      color: theme.colors.text,
      marginLeft: Space.base,
      marginBottom: Space.xs,
    },
    headerInfo: {
      marginLeft: Space.base,
      marginBottom: Space.sm,
    },
    section: {
      marginBottom: Space.sm,
    },
    sectionHeader: {
      marginLeft: Space.base,
      paddingVertical: Space.xs,
      marginBottom: 2,
    },
    listContainer: {
      backgroundColor: 'transparent',
    },
    emptyStateWrapper: {
      alignItems: 'center',
      paddingHorizontal: Space.xxxl,
    },
    linkContainer: {
      width: '100%',
      marginTop: Space.xxxl,
      alignItems: 'center',
    },
    linkDivider: {
      width: 32,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.borderSecondary,
      marginBottom: Space.xl,
    },
    linkTitle: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.heavy,
      letterSpacing: LetterSpacing.caps,
      textTransform: 'uppercase',
      color: theme.colors.text,
      marginBottom: Space.xs,
    },
    linkSub: {
      fontSize: FontSize.micro,
      fontWeight: FontWeight.bold,
      letterSpacing: LetterSpacing.wide,
      textTransform: 'uppercase',
      opacity: 0.4,
      color: theme.colors.textSecondary,
    },
    linkBtnText: {
      color: '#fff',
      fontWeight: FontWeight.bold,
      fontSize: 15,
    },
  })
