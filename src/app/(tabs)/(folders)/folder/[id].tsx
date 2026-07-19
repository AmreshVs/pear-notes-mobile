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
  getNotes,
  getSelectedNote,
  setSelectedNote,
  updateNote,
} from '@pear-notes/core/store/slices/notesSlice.js'
import { getLockMethod } from '@pear-notes/core/store/slices/settingsSlice.js'
import { getLocalPreferences } from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import { setShowPairingInput } from '@pear-notes/core/store/slices/syncSlice.js'
import { getSearchQuery, setSearchQuery } from '@pear-notes/core/store/slices/uiSlice.js'
import { formatDate } from '@pear-notes/core/utils.js'
import * as Clipboard from 'expo-clipboard'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { NoteCard } from '@/components/NoteCard'
import { Text, View, createThemedStylesheet, useTheme } from '@/components/Themed'
import {
  FontSize,
  FontWeight,
  LetterSpacing,
  Space,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_44,
  UI_SIZE_2,
  UI_SIZE_42,
  commonStyles,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { toggleNoteLock } from '@/lib/noteLockActions'
import { useNoteEditor } from '@/providers/NoteEditorContext'
import { buildNoteSections } from '@/utils/noteSections'
import { getAttachmentInfo, getFirstImageUrl, getPreview } from '@/utils/noteUtils'

export default function FolderNotesScreen() {
  const { height } = useWindowDimensions()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const theme = useTheme()
  const { colors, isDark } = theme
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const dispatch = useDispatch()
  const { openNote } = useNoteEditor()
  const allFolders = useSelector(getFolders)
  const notes = useSelector(getFilteredNotes)
  const lockMethod = useSelector(getLockMethod)
  const searchQuery = useSelector(getSearchQuery) as string
  const selectedNote = useSelector(getSelectedNote)
  const localPreferences = useSelector(getLocalPreferences)
  const allNotes = useSelector(getNotes) as any[]
  const isTrashFolder = id === RECENTLY_DELETED_KEY
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

  const groupedNotes = useMemo(
    () => buildNoteSections(notes, t, isTrashFolder),
    [notes, t, isTrashFolder],
  )

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
    [dispatch, id, t],
  )

  const handleMoveNote = useCallback(
    (noteId: string, folderId: string) => {
      dispatch(updateNote({ key: noteId, folderKey: folderId } as any))
    },
    [dispatch],
  )

  const handleTogglePinNote = useCallback(
    (noteId: string, currentlyPinned: boolean) => {
      dispatch(updateNote({ key: noteId, pinned: !currentlyPinned } as any))
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

  const notesRef = useRef(notes)
  notesRef.current = notes

  const handleCopyNoteById = useCallback(
    (noteId: string) => {
      const target = (notesRef.current as any[]).find((n) => n.key === noteId)
      if (target) handleCopyNote(target.value?.title, target.value?.note)
    },
    [handleCopyNote],
  )

  const handleToggleLockNote = useCallback(
    (noteId: string, currentlyLocked: boolean) => {
      toggleNoteLock({
        key: noteId,
        currentlyLocked,
        reason: t('noteCard.unlockReason'),
        dispatch,
        lockMethod,
      })
    },
    [dispatch, lockMethod, t],
  )

  const attachmentByKey = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getAttachmentInfo>>()
    for (const n of notes as any[]) map.set(n.key, getAttachmentInfo(n.value?.note))
    return map
  }, [notes])

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
      openNote(selectedNote, { focusTitle: true })
    }
  }, [selectedNote, openNote])

  useEffect(() => {
    if (selectedNote) {
      lastSelectedNoteRef.current = selectedNote
    }
  }, [selectedNote])

  const scrollContentStyle = useMemo(
    () => [
      styles.scrollContent,
      { paddingBottom: groupedNotes.length > 0 ? Space.scrollBottom : Space.xl },
    ],
    [groupedNotes.length, styles.scrollContent],
  )

  const emptyStateStyle = useMemo(
    () => [styles.emptyStateWrapper, { marginTop: height * 0.18 }],
    [height, styles.emptyStateWrapper],
  )

  const renderNoteCard = useCallback(
    (note: any, index: number, sectionIndex: number, sectionDataLength: number) => {
      const isLast = index === sectionDataLength - 1
      const animationIndex = sectionIndex * 3 + index

      const isLocked = note.value?.locked === true
      const isPinned = note.value?.pinned === true

      const folderName =
        folder?.id === ALL_NOTES_KEY
          ? allFolders.find((f: any) => f.id === note.value?.folderKey)?.name
          : undefined

      return (
        <NoteCard
          key={note.key}
          id={note.key}
          title={note.value?.title}
          date={formatDate(note.value?.updatedAt || note.value?.createdAt)}
          summary={getPreview(note.value?.note)}
          attachment={attachmentByKey.get(note.key) ?? null}
          rawImageUrl={getFirstImageUrl(note.value?.note)}
          folderName={folderName}
          selected={false}
          isLast={isLast}
          animationIndex={animationIndex}
          locked={isLocked}
          pinned={isPinned}
          onPress={handleSelectNote}
          onDelete={handleDeleteNote}
          onCopy={handleCopyNoteById}
          onToggleLock={handleToggleLockNote}
          onTogglePin={isTrashFolder ? undefined : handleTogglePinNote}
          moveFolders={moveFolders}
          onMoveTo={handleMoveNote}
        />
      )
    },
    [
      allFolders,
      folder?.id,
      attachmentByKey,
      handleSelectNote,
      handleDeleteNote,
      handleCopyNoteById,
      handleTogglePinNote,
      handleToggleLockNote,
      isTrashFolder,
      moveFolders,
      handleMoveNote,
    ],
  )

  const renderSection = useCallback(
    (section: any, sectionIndex: number) => {
      const renderItem = (note: any, index: number) =>
        renderNoteCard(note, index, sectionIndex, section.data.length)

      return (
        <View key={section.title} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={commonThemedStyles.sectionCap}>{section.title}</Text>
          </View>
          <View style={styles.listContainer}>{section.data.map(renderItem)}</View>
        </View>
      )
    },
    [
      renderNoteCard,
      styles.section,
      styles.sectionHeader,
      styles.listContainer,
      commonThemedStyles.sectionCap,
    ],
  )

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
        {!isTrashFolder && (
          <Stack.Toolbar.Button icon="square.and.pencil" onPress={handleCreateNote} />
        )}
        {!folder?.isSystem && (
          <Stack.Toolbar.Menu icon="ellipsis">
            <Stack.Toolbar.MenuAction icon="pencil" onPress={handleRenameFolder}>
              {t('folders.renameTitle')}
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction icon="trash" destructive onPress={handleDeleteFolder}>
              {t('folders.deleteTitle')}
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        )}
      </Stack.Toolbar>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={scrollContentStyle}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>{folder?.name || t('folders.title')}</Text>
        <View style={styles.headerInfo}>
          <Text style={commonThemedStyles.sectionCap}>
            {t('folderView.noteCount', { count: notes.length })}
          </Text>
        </View>

        {groupedNotes.length === 0 ? (
          <View style={emptyStateStyle}>
            {searchQuery.trim().length > 0 ? (
              <>
                <SymbolView
                  name="magnifyingglass"
                  size={UI_ICON_SIZE_44}
                  tintColor={colors.textMuted}
                />
                <Text style={[styles.emptyTitle, commonThemedStyles.emptyTitle]}>
                  {t('folderView.empty.noMatchesTitle')}
                </Text>
                <Text style={commonThemedStyles.emptySubtitle}>
                  {t('folderView.empty.noMatchesSubtitle')}
                </Text>
              </>
            ) : isTrashFolder ? (
              <>
                <SymbolView name="trash" size={UI_ICON_SIZE_44} tintColor={colors.textMuted} />
                <Text style={[styles.emptyTitle, commonThemedStyles.emptyTitle]}>
                  {t('folderView.empty.trashEmptyTitle')}
                </Text>
                <Text style={commonThemedStyles.emptySubtitle}>
                  {t('folderView.empty.trashEmptySubtitle')}
                </Text>
              </>
            ) : localPreferences['isSynced'] !== true && allNotes.length === 0 ? (
              <>
                <SymbolView name="book.closed" size={UI_ICON_SIZE_44} tintColor={colors.primary} />
                <Text style={styles.onboardingTitle}>{t('folderView.empty.onboardingTitle')}</Text>
                <Text style={commonThemedStyles.emptySubtitle}>
                  {t('folderView.empty.onboardingSubtitle')}
                </Text>
                <View style={styles.ctaRow}>
                  <Pressable
                    onPress={handleCreateNote}
                    style={({ pressed }) => [styles.primaryBtn, pressed && commonStyles.pressed]}
                  >
                    <SymbolView name="plus" size={UI_ICON_SIZE_16} tintColor={colors.onPrimary} />
                    <Text style={styles.primaryBtnText}>{t('folderView.empty.newNoteBtn')}</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleLinkDevice}
                    style={({ pressed }) => [styles.secondaryBtn, pressed && commonStyles.pressed]}
                  >
                    <SymbolView
                      name="laptopcomputer.and.iphone"
                      size={UI_ICON_SIZE_16}
                      tintColor={colors.primary}
                    />
                    <Text style={styles.secondaryBtnText}>{t('folderView.empty.connectBtn')}</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <SymbolView name="note.text" size={UI_ICON_SIZE_44} tintColor={colors.textMuted} />
                <Text style={[styles.emptyTitle, commonThemedStyles.emptyTitle]}>
                  {t('folderView.empty.noNotesTitle')}
                </Text>
                <Text style={commonThemedStyles.emptySubtitle}>
                  {t('folderView.empty.noNotesSubtitle')}
                </Text>
              </>
            )}
          </View>
        ) : (
          groupedNotes.map(renderSection)
        )}
      </ScrollView>
    </View>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      ...commonStyles.flex1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 0,
      paddingTop: Space.lg,
    },

    pageTitle: {
      fontSize: FontSize.hero,
      lineHeight: UI_SIZE_42,
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
      marginBottom: UI_SIZE_2,
    },
    listContainer: {
      backgroundColor: theme.colors.transparent,
    },
    emptyStateWrapper: {
      alignItems: 'center',
      paddingHorizontal: Space.xxxl,
    },
    onboardingTitle: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      letterSpacing: -0.3,
      textAlign: 'center',
      marginTop: Space.md,
      marginBottom: Space.sm,
      color: theme.colors.text,
    },
    ctaRow: {
      flexDirection: 'row',
      gap: Space.sm,
      marginTop: Space.lg,
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.xs,
      paddingHorizontal: Space.lg,
      paddingVertical: Space.md,
      borderRadius: Space.sm,
      backgroundColor: theme.colors.primary,
    },
    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.xs,
      paddingHorizontal: Space.lg,
      paddingVertical: Space.md,
      borderRadius: Space.sm,
      borderWidth: 1,
      borderColor: theme.colors.separator,
    },
    primaryBtnText: {
      color: theme.colors.onPrimary,
      fontWeight: FontWeight.bold,
      fontSize: FontSize.body,
    },
    secondaryBtnText: {
      color: theme.colors.primary,
      fontWeight: FontWeight.bold,
      fontSize: FontSize.body,
    },
    emptyTitle: {
      marginTop: Space.md,
    },
  })
  return styles
})
