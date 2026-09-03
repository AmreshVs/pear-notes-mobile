import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  SectionList,
  StyleSheet,
  useWindowDimensions,
} from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import * as Clipboard from 'expo-clipboard'
import { router, Stack, useLocalSearchParams } from 'expo-router'

import {
  ALL_NOTES_KEY,
  FOLDER_ERROR,
  RECENTLY_DELETED_KEY,
  SEARCH_QUERY_MAX_LENGTH,
  TRASH_RETENTION_DAYS,
} from '@pear-notes/core/constant.js'
import {
  deleteFolder,
  getFolders,
  setSelectedFolder,
  updateFolder,
} from '@pear-notes/core/store/slices/foldersSlice.js'
import {
  createNote,
  deleteNote,
  deleteNotes,
  getFilteredNotes,
  getNotes,
  getSelectedNote,
  moveNotes,
  purgeExpiredTrash,
  restoreNote,
  restoreNotes,
  setSelectedNote,
  updateNote,
} from '@pear-notes/core/store/slices/notesSlice.js'
import { getLockMethod } from '@pear-notes/core/store/slices/settingsSlice.js'
import { getLocalPreferences } from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import { setShowPairingInput } from '@pear-notes/core/store/slices/syncSlice.js'
import { getSearchQuery, setSearchQuery } from '@pear-notes/core/store/slices/uiSlice.js'
import { formatDate, validateFolderName } from '@pear-notes/core/utils.js'

import { CollapsedNavTitle } from '@/components/CollapsedNavTitle'
import { FolderEmptyState } from '@/components/FolderEmptyState'
import { LockNowButton } from '@/components/LockNowButton'
import { NoteCard } from '@/components/NoteCard'
import { NoteSelectionToolbar } from '@/components/NoteSelectionToolbar'
import { createThemedStylesheet, Text, useTheme, View } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  LetterSpacing,
  Space,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_42,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import {
  LIST_BATCH_RENDER_COUNT,
  LIST_INITIAL_RENDER_COUNT,
  LIST_WINDOW_SIZE,
  MIN_TITLE_COLLAPSE_DISTANCE,
} from '@/constants/constants'
import { hapticLight, hapticMedium, hapticSuccess, hapticWarning } from '@/lib/haptics'
import { toggleNoteLock } from '@/lib/noteLockActions'
import { useNoteEditor } from '@/providers/NoteEditorContext'
import { getNoteMetadata } from '@/utils/noteMetadata'
import { buildNoteSections } from '@/utils/noteSections'
import { getPreview } from '@/utils/noteUtils'

import { useNoteSelection } from './useNoteSelection'

const MIN_NOTES_FOR_MULTI_SELECT = 2
const SCROLL_EVENT_THROTTLE = 16

const SUPPORTS_TOOLBAR_SEARCH =
  Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26

export default function FolderNotesScreen() {
  const { height } = useWindowDimensions()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const { colors, isDark } = useTheme()
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
    hapticLight()
    dispatch(setShowPairingInput(true))
  }, [dispatch])

  const handleRestoreBackup = useCallback(() => {
    hapticLight()
    router.push('/settings/backup')
  }, [])

  const folder = useMemo(
    () => allFolders.find((f: any) => f.id === id || f.key === id),
    [allFolders, id],
  )

  const moveFolders = useMemo(
    () => allFolders.filter((f: any) => !f.isTrash && f.id !== ALL_NOTES_KEY && f.id !== id),
    [allFolders, id],
  )

  const groupedNotes = useMemo(
    () =>
      buildNoteSections(notes, t, isTrashFolder).map((section, sectionIndex) => ({
        ...section,
        sectionIndex,
      })),
    [notes, t, isTrashFolder],
  )

  const orderedKeys = useMemo(() => notes.map((note: any) => note.key), [notes])

  const {
    isSelecting,
    selectedKeys,
    selectedCount,
    isAllSelected,
    toggleSelect,
    startSelecting,
    selectAll,
    clearSelection,
    exitSelection,
  } = useNoteSelection(id as string, orderedKeys)

  const canMultiSelect = orderedKeys.length >= MIN_NOTES_FOR_MULTI_SELECT

  const handleSelectNote = useCallback(
    (noteId: string) => {
      dispatch(setSelectedNote(noteId as any))
      openNote(noteId)
    },
    [dispatch, openNote],
  )

  const handleStartSelecting = useCallback(() => {
    hapticLight()
    startSelecting()
  }, [startSelecting])

  const handleToggleSelect = useCallback(
    (noteId: string) => {
      hapticLight()
      toggleSelect(noteId)
    },
    [toggleSelect],
  )

  const handleBulkMove = useCallback(
    (folderId: string) => {
      hapticSuccess()
      dispatch(moveNotes({ keys: selectedKeys, folderKey: folderId } as any))
      exitSelection()
    },
    [dispatch, selectedKeys, exitSelection],
  )

  const handleBulkRestore = useCallback(() => {
    if (selectedKeys.length === 0) return
    hapticSuccess()
    dispatch(restoreNotes(selectedKeys as any))
    exitSelection()
  }, [dispatch, selectedKeys, exitSelection])

  const handleBulkDelete = useCallback(() => {
    const count = selectedKeys.length
    if (count === 0) return
    const isTrash = id === RECENTLY_DELETED_KEY
    Alert.alert(
      isTrash
        ? t('folderView.selection.confirmPermanentDeleteTitle', { count })
        : t('folderView.selection.confirmDeleteTitle', { count }),
      isTrash
        ? t('folderView.selection.confirmPermanentDeleteBody')
        : t('folderView.selection.confirmDeleteBody', { days: TRASH_RETENTION_DAYS }),
      [
        { text: t('folders.buttons.cancel'), style: 'cancel' },
        {
          text: t('folders.buttons.delete'),
          style: 'destructive',
          onPress: () => {
            hapticWarning()
            dispatch(deleteNotes(selectedKeys as any))
            exitSelection()
          },
        },
      ],
    )
  }, [dispatch, selectedKeys, exitSelection, id, t])

  const handleRestoreNote = useCallback(
    (noteId: string) => {
      hapticSuccess()
      dispatch(restoreNote(noteId as any))
    },
    [dispatch],
  )

  const handleCreateNote = useCallback(() => {
    hapticLight()
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
              onPress: () => {
                hapticWarning()
                dispatch(deleteNote(noteId as any))
              },
            },
          ],
        )
      } else {
        hapticWarning()
        dispatch(deleteNote(noteId as any))
      }
    },
    [dispatch, id, t],
  )

  const handleMoveNote = useCallback(
    (noteId: string, folderId: string) => {
      hapticSuccess()
      dispatch(updateNote({ key: noteId, folderKey: folderId } as any))
    },
    [dispatch],
  )

  const handleTogglePinNote = useCallback(
    (noteId: string, currentlyPinned: boolean) => {
      hapticMedium()
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
      hapticSuccess()
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
        lockReason: t('noteCard.lockReason'),
        dispatch,
        lockMethod,
      })
    },
    [dispatch, lockMethod, t],
  )

  const handleRenameFolder = useCallback(() => {
    if (!folder) return
    Alert.prompt(
      t('folders.renameTitle'),
      undefined,
      (newName) => {
        const result = validateFolderName(allFolders, newName, id)
        if (!result.valid) {
          hapticWarning()
          Alert.alert(
            t('folders.renameTitle'),
            result.error === FOLDER_ERROR.DUPLICATE_NAME
              ? t('folders.errors.duplicateName', { name: result.name })
              : t('folders.errors.emptyName'),
          )
          return
        }
        if (result.name === folder.name) return
        hapticSuccess()
        dispatch(updateFolder({ id, name: result.name } as any))
      },
      'plain-text',
      folder.name,
    )
  }, [allFolders, dispatch, folder, id, t])

  const handleDeleteFolder = useCallback(() => {
    Alert.alert(t('folders.deleteTitle'), t('folders.deleteDescription'), [
      { text: t('folders.buttons.cancel'), style: 'cancel' },
      {
        text: t('folders.buttons.delete'),
        style: 'destructive',
        onPress: () => {
          hapticWarning()
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

  useEffect(() => {
    if (isTrashFolder) dispatch(purgeExpiredTrash())
  }, [isTrashFolder, dispatch])

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
      const metadata = getNoteMetadata(note.value)

      const noteFolder =
        folder?.id === ALL_NOTES_KEY
          ? allFolders.find((f: any) => f.id === note.value?.folderKey)
          : undefined
      const folderName = noteFolder?.name

      return (
        <NoteCard
          key={note.key}
          id={note.key}
          title={note.value?.title}
          date={formatDate(note.value?.updatedAt || note.value?.createdAt)}
          summary={metadata.preview}
          attachment={metadata.attachment}
          rawImageUrl={metadata.imageUrl}
          folderName={folderName}
          folderIconToken={noteFolder?.icon}
          selected={false}
          selecting={isSelecting}
          checked={selectedKeys.includes(note.key)}
          isFirst={index === 0}
          isLast={isLast}
          grouped
          animationIndex={animationIndex}
          locked={isLocked}
          pinned={isPinned}
          onPress={handleSelectNote}
          onToggleSelect={handleToggleSelect}
          onDelete={handleDeleteNote}
          onRestore={isTrashFolder ? handleRestoreNote : undefined}
          onCopy={isTrashFolder ? undefined : handleCopyNoteById}
          onToggleLock={isTrashFolder ? undefined : handleToggleLockNote}
          onTogglePin={isTrashFolder ? undefined : handleTogglePinNote}
          moveFolders={isTrashFolder ? undefined : moveFolders}
          onMoveTo={isTrashFolder ? undefined : handleMoveNote}
        />
      )
    },
    [
      allFolders,
      folder?.id,
      isSelecting,
      selectedKeys,
      handleToggleSelect,
      handleSelectNote,
      handleDeleteNote,
      handleRestoreNote,
      handleCopyNoteById,
      handleTogglePinNote,
      handleToggleLockNote,
      isTrashFolder,
      moveFolders,
      handleMoveNote,
    ],
  )

  const renderItem = useCallback(
    ({ item, index, section }: any) =>
      renderNoteCard(item, index, section.sectionIndex, section.data.length),
    [renderNoteCard],
  )

  const renderSectionHeader = useCallback(
    ({ section }: any) => (
      <View style={section.sectionIndex === 0 ? styles.sectionHeader : styles.sectionHeaderSpaced}>
        <Text style={commonThemedStyles.sectionCamelCase}>{section.title}</Text>
      </View>
    ),
    [styles.sectionHeader, styles.sectionHeaderSpaced, commonThemedStyles.sectionCamelCase],
  )

  const noteKey = useCallback((item: any) => item.key, [])

  const titleBlockHeightRef = useRef(0)
  const scrollBaselineRef = useRef<number | null>(null)
  const isTitleCollapsedRef = useRef(false)
  const [isTitleCollapsed, setIsTitleCollapsed] = useState(false)

  const handleTitleBlockLayout = useCallback((event: LayoutChangeEvent) => {
    titleBlockHeightRef.current = event.nativeEvent.layout.height
  }, [])

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentInset } = event.nativeEvent
    const restingOffset = -(contentInset?.top ?? 0)
    if (
      !isTitleCollapsedRef.current &&
      (scrollBaselineRef.current === null ||
        Math.min(contentOffset.y, restingOffset) < scrollBaselineRef.current)
    ) {
      scrollBaselineRef.current = Math.min(contentOffset.y, restingOffset)
    }
    const scrolled = contentOffset.y - (scrollBaselineRef.current ?? 0)
    const threshold = Math.max(titleBlockHeightRef.current, MIN_TITLE_COLLAPSE_DISTANCE)
    const next = titleBlockHeightRef.current > 0 && scrolled >= threshold
    if (next === isTitleCollapsedRef.current) return
    isTitleCollapsedRef.current = next
    setIsTitleCollapsed(next)
  }, [])

  const listHeader = useMemo(
    () => (
      <>
        <View onLayout={handleTitleBlockLayout}>
          <Text style={styles.pageTitle} numberOfLines={2}>
            {folder?.name || t('folders.title')}
          </Text>
          <View style={styles.headerInfo}>
            <Text style={commonThemedStyles.sectionCap} accessibilityLiveRegion="polite">
              {isSelecting
                ? t('folderView.selection.selectedCount', { count: selectedCount })
                : t('folderView.noteCount', { count: notes.length })}
            </Text>
            <LockNowButton />
          </View>
        </View>
        {isTrashFolder && notes.length > 0 && (
          <Text style={styles.retentionNotice}>
            {t('folderView.trashRetentionNotice', { days: TRASH_RETENTION_DAYS })}
          </Text>
        )}
      </>
    ),
    [
      folder?.name,
      notes.length,
      isSelecting,
      isTrashFolder,
      selectedCount,
      t,
      styles.pageTitle,
      styles.headerInfo,
      styles.retentionNotice,
      commonThemedStyles.sectionCap,
    ],
  )

  const listEmpty = useMemo(
    () => (
      <FolderEmptyState
        containerStyle={emptyStateStyle}
        hasSearchQuery={searchQuery.trim().length > 0}
        isTrash={isTrashFolder}
        showOnboarding={localPreferences['isSynced'] !== true && allNotes.length === 0}
        onCreateNote={handleCreateNote}
        onLinkDevice={handleLinkDevice}
        onRestoreBackup={handleRestoreBackup}
      />
    ),
    [
      emptyStateStyle,
      searchQuery,
      isTrashFolder,
      localPreferences,
      allNotes.length,
      handleCreateNote,
      handleLinkDevice,
      handleRestoreBackup,
    ],
  )

  const handleSearchChange = useCallback(
    (event: { nativeEvent: { text: string } }) =>
      dispatch(setSearchQuery(event.nativeEvent.text.slice(0, SEARCH_QUERY_MAX_LENGTH) as any)),
    [dispatch],
  )

  const headerTitle = useCallback(
    () => (
      <CollapsedNavTitle
        title={folder?.name || t('folders.title')}
        subtitle={t('folderView.noteCount', { count: notes.length })}
      />
    ),
    [folder?.name, notes.length, t],
  )

  const screenOptions = useMemo(
    () => ({
      headerTitle: isTitleCollapsed ? headerTitle : '',
      headerLargeTitle: false,
      headerTransparent: true,
      headerBlurEffect: isDark ? ('dark' as const) : ('light' as const),
      headerSearchBarOptions: {
        placeholder: t('folderView.searchPlaceholder'),
        hideWhenScrolling: false,
        placement: 'automatic' as const,
        allowToolbarIntegration: true,
        textColor: colors.text,
        hintTextColor: colors.textSecondary,
        headerIconColor: colors.textSecondary,
        onChangeText: handleSearchChange,
      },
    }),
    [
      isDark,
      t,
      colors.text,
      colors.textSecondary,
      handleSearchChange,
      isTitleCollapsed,
      headerTitle,
    ],
  )

  return (
    <View style={styles.container}>
      <Stack.Screen options={screenOptions} />
      {isSelecting ? (
        <NoteSelectionToolbar
          selectedCount={selectedCount}
          isAllSelected={isAllSelected}
          isTrash={isTrashFolder}
          moveFolders={moveFolders}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onDone={exitSelection}
          onMoveTo={handleBulkMove}
          onRestore={handleBulkRestore}
          onDelete={handleBulkDelete}
        />
      ) : (
        <>
          <Stack.Toolbar placement="right">
            {!folder?.isSystem && (
              <Stack.Toolbar.Menu icon="ellipsis" accessibilityLabel={t('folders.options')}>
                <Stack.Toolbar.MenuAction icon="pencil" onPress={handleRenameFolder}>
                  {t('folders.renameTitle')}
                </Stack.Toolbar.MenuAction>
                <Stack.Toolbar.MenuAction icon="trash" destructive onPress={handleDeleteFolder}>
                  {t('folders.deleteTitle')}
                </Stack.Toolbar.MenuAction>
              </Stack.Toolbar.Menu>
            )}
            <Stack.Toolbar.Button
              icon="checkmark.circle"
              accessibilityLabel={t('folderView.selection.select')}
              disabled={!canMultiSelect}
              onPress={handleStartSelecting}
            />
          </Stack.Toolbar>
          {(!isTrashFolder || SUPPORTS_TOOLBAR_SEARCH) && (
            <Stack.Toolbar placement="bottom">
              <Stack.Toolbar.SearchBarSlot />
              <Stack.Toolbar.Spacer />
              {!isTrashFolder && (
                <Stack.Toolbar.Button
                  icon="square.and.pencil"
                  accessibilityLabel={t('folderView.empty.newNoteBtn')}
                  onPress={handleCreateNote}
                />
              )}
            </Stack.Toolbar>
          )}
        </>
      )}
      <SectionList
        sections={groupedNotes}
        keyExtractor={noteKey}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={scrollContentStyle}
        onScroll={handleScroll}
        scrollEventThrottle={SCROLL_EVENT_THROTTLE}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={LIST_INITIAL_RENDER_COUNT}
        maxToRenderPerBatch={LIST_BATCH_RENDER_COUNT}
        windowSize={LIST_WINDOW_SIZE}
      />
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
      paddingRight: Space.base,
    },
    headerInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.md,
      marginLeft: Space.base,
      marginRight: Space.base,
      marginBottom: Space.sm,
    },
    retentionNotice: {
      marginHorizontal: Space.base,
      marginBottom: Space.base,
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
      lineHeight: FontSize.caption * 1.4,
    },
    sectionHeader: {
      marginLeft: Space.base,
    },
    sectionHeaderSpaced: {
      marginLeft: Space.base,
      marginTop: Space.base,
    },
    emptyStateWrapper: {
      alignItems: 'center',
      paddingHorizontal: Space.xxxl,
    },
  })
  return styles
})
