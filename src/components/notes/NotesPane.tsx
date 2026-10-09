import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Platform, SectionList, StyleSheet, useWindowDimensions } from 'react-native'
import type { SearchBarCommands } from 'react-native-screens'
import { shallowEqual, useDispatch, useSelector } from 'react-redux'
import { router, Stack, useNavigation } from 'expo-router'

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
import { getMeaningSearchNotice } from '@pear-notes/core/store/slices/localAiSlice.js'
import {
  createNote,
  deleteNote,
  deleteNotes,
  getFilteredNotes,
  getMeaningNotes,
  getNotes,
  getSelectedNote,
  moveNotes,
  purgeExpiredTrash,
  restoreNote,
  restoreNotes,
  updateNote,
} from '@pear-notes/core/store/slices/notesSlice.js'
import { getTitleHighlight, prewarmSearch } from '@pear-notes/core/store/slices/searchSlice.js'
import { getLockMethod } from '@pear-notes/core/store/slices/settingsSlice.js'
import { getLocalPreferences } from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import { setShowPairingInput } from '@pear-notes/core/store/slices/syncSlice.js'
import { getSearchQuery, setSearchQuery } from '@pear-notes/core/store/slices/uiSlice.js'
import { getOtherVaults, moveToVault } from '@pear-notes/core/store/slices/vaultsSlice.js'
import { formatDate, validateFolderName } from '@pear-notes/core/utils.js'

import { CollapsedNavTitle } from '@/components/CollapsedNavTitle'
import { FolderEmptyState } from '@/components/FolderEmptyState'
import { LockNowButton } from '@/components/LockNowButton'
import { NoteCard } from '@/components/NoteCard'
import { SearchScopeChips } from '@/components/notes/SearchScopeChips'
import { NoteSelectionToolbar } from '@/components/NoteSelectionToolbar'
import { ScreenEdgeFades } from '@/components/ScreenEdgeFades'
import { createThemedStylesheet, Text, useTheme, View } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  LetterSpacing,
  Space,
  UI_SIZE_42,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import {
  LIST_BATCH_RENDER_COUNT,
  LIST_INITIAL_RENDER_COUNT,
  LIST_WINDOW_SIZE,
} from '@/constants/constants'
import { HIDDEN_SCROLL_EDGE_EFFECTS } from '@/constants/navigation'
import { useNoteSearch } from '@/hooks/useNoteSearch'
import { useNoteSelection } from '@/hooks/useNoteSelection'
import { useTitleCollapse } from '@/hooks/useTitleCollapse'
import { useVisibleNotes } from '@/hooks/useVisibleNotes'
import { hapticLight, hapticMedium, hapticSuccess, hapticWarning } from '@/lib/haptics'
import { toggleNoteLock } from '@/lib/noteLockActions'
import { getVaultLabel } from '@/lib/vaultLabels'
import { confirmVaultMove } from '@/lib/vaultMove'
import type { Vault } from '@/lib/vaults.types'
import { useNoteEditor } from '@/providers/NoteEditorContext'
import { getNoteMetadata } from '@/utils/noteMetadata'
import { buildNoteSections } from '@/utils/noteSections'

import { NotesPaneProps } from './types'

const MIN_NOTES_FOR_MULTI_SELECT = 2

const renderEmptyHeaderLeft = () => null

const SUPPORTS_TOOLBAR_SEARCH =
  Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26

export function NotesPane({ folderId, embedded, onRequestClose }: NotesPaneProps) {
  const { height } = useWindowDimensions()
  const id = folderId

  const closePane = useCallback(() => {
    if (onRequestClose) {
      onRequestClose()
      return
    }
    router.back()
  }, [onRequestClose])
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const dispatch = useDispatch()
  const { openNote } = useNoteEditor()
  const searchBarRef = useRef<SearchBarCommands>(null)
  const navigation = useNavigation()
  const allFolders = useSelector(getFolders)
  const notes = useSelector(getFilteredNotes)
  const lockMethod = useSelector(getLockMethod)
  const searchQuery = useSelector(getSearchQuery) as string
  const selectedNote = useSelector(getSelectedNote)
  const localPreferences = useSelector(getLocalPreferences)
  const hasAnyNotes = useSelector((state: any) => (getNotes(state) as any[]).length > 0)
  const isTrashFolder = id === RECENTLY_DELETED_KEY
  const { searchHits, searchTerms, searchScope, hideEmptyState, showSearchScope, showFolderNames } =
    useNoteSearch(id)
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

  const folderById = useMemo(() => new Map(allFolders.map((f: any) => [f.id, f])), [allFolders])

  const moveFolders = useMemo(
    () => allFolders.filter((f: any) => !f.isTrash && f.id !== ALL_NOTES_KEY && f.id !== id),
    [allFolders, id],
  )

  const meaningNotes = useSelector(getMeaningNotes) as { key: string; snippet: string }[]
  const meaningNotice = useSelector(getMeaningSearchNotice, shallowEqual) as {
    kind: string
    done?: number
    total?: number
  } | null
  const allNotes = useSelector(getNotes) as any[]
  const hasSearchQuery = searchQuery.trim().length > 0
  const meaningRows = useMemo(() => {
    if (!hasSearchQuery || meaningNotes.length === 0) return []
    const byKey = new Map(allNotes.map((note: any) => [note.key, note]))
    return meaningNotes.flatMap((row) => {
      const note = byKey.get(row.key)
      return note ? [{ ...note, snippet: row.snippet }] : []
    })
  }, [hasSearchQuery, meaningNotes, allNotes])
  const meaningNoticeText =
    id === RECENTLY_DELETED_KEY
      ? null
      : meaningNotice?.kind === 'indexing'
        ? t('search.meaning.indexing', { done: meaningNotice.done, total: meaningNotice.total })
        : meaningNotice?.kind === 'charging'
          ? t('search.meaning.charging', { total: meaningNotice.total })
          : meaningNotice
            ? t('search.meaning.preparing')
            : null

  const groupedNotes = useMemo(
    () =>
      [
        ...buildNoteSections(notes, t, isTrashFolder),
        ...(meaningRows.length > 0
          ? [{ title: t('search.meaning.title'), data: meaningRows }]
          : []),
      ].map((section, sectionIndex) => ({
        ...section,
        sectionIndex,
      })),
    [notes, t, isTrashFolder, meaningRows],
  )

  const orderedKeys = useMemo(
    () => [...notes, ...meaningRows].map((note: any) => note.key),
    [notes, meaningRows],
  )
  const { onViewableItemsChanged, viewabilityConfig } = useVisibleNotes(orderedKeys)

  const {
    isSelecting,
    selectedKeys,
    selectedKeySet,
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
      searchBarRef.current?.blur()
      openNote(noteId)
    },
    [openNote],
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

  const otherVaults = useSelector(getOtherVaults) as Vault[]
  const moveVaults = useMemo(
    () => otherVaults.map((vault) => ({ id: vault.id, name: getVaultLabel(vault, t) })),
    [otherVaults, t],
  )

  const handleMoveNoteToVault = useCallback(
    (noteId: string, vaultId: string) => {
      const vault = moveVaults.find((item) => item.id === vaultId)
      if (!vault) return
      confirmVaultMove(vault.name, 1, t, () =>
        dispatch(moveToVault({ targetId: vaultId, noteKeys: [noteId] })),
      )
    },
    [dispatch, moveVaults, t],
  )

  const handleTogglePinNote = useCallback(
    (noteId: string, currentlyPinned: boolean) => {
      hapticMedium()
      dispatch(updateNote({ key: noteId, pinned: !currentlyPinned } as any))
    },
    [dispatch],
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
          closePane()
        },
      },
    ])
  }, [closePane, dispatch, id, t])

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

  useEffect(
    () =>
      navigation.addListener('beforeRemove', () => {
        searchBarRef.current?.cancelSearch()
      }),
    [navigation],
  )

  useEffect(() => {
    const searchBar = searchBarRef
    return () => {
      searchBar.current?.cancelSearch()
      dispatch(setSearchQuery(''))
    }
  }, [dispatch, id])

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

      const noteFolder = showFolderNames ? folderById.get(note.value?.folderKey) : undefined
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
          pdfAttachment={metadata.pdf}
          folderName={folderName}
          folderIconToken={noteFolder?.icon}
          selected={false}
          selecting={isSelecting}
          checked={selectedKeySet.has(note.key)}
          isFirst={index === 0}
          isLast={isLast}
          grouped
          animationIndex={animationIndex}
          locked={isLocked}
          pinned={isPinned}
          searchHit={searchHits[note.key] ?? null}
          meaningSnippet={note.snippet || null}
          titleHighlight={getTitleHighlight(note.value?.title, searchTerms)}
          onPress={handleSelectNote}
          onToggleSelect={handleToggleSelect}
          onDelete={handleDeleteNote}
          onRestore={isTrashFolder ? handleRestoreNote : undefined}
          onToggleLock={isTrashFolder ? undefined : handleToggleLockNote}
          onTogglePin={isTrashFolder ? undefined : handleTogglePinNote}
          moveFolders={isTrashFolder ? undefined : moveFolders}
          onMoveTo={isTrashFolder ? undefined : handleMoveNote}
          moveVaults={moveVaults}
          onMoveToVault={isTrashFolder ? undefined : handleMoveNoteToVault}
        />
      )
    },
    [
      folderById,
      showFolderNames,
      searchHits,
      searchTerms,
      isSelecting,
      selectedKeySet,
      handleToggleSelect,
      handleSelectNote,
      handleDeleteNote,
      handleRestoreNote,
      handleTogglePinNote,
      handleToggleLockNote,
      isTrashFolder,
      moveFolders,
      handleMoveNote,
      moveVaults,
      handleMoveNoteToVault,
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

  const { isTitleCollapsed, handleTitleBlockLayout, scrollProps } = useTitleCollapse()

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
        {showSearchScope && (
          <SearchScopeChips folderName={folder?.name || t('folders.title')} scope={searchScope} />
        )}
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
      showSearchScope,
      searchScope,
      selectedCount,
      t,
      styles.pageTitle,
      styles.headerInfo,
      styles.retentionNotice,
      commonThemedStyles.sectionCap,
    ],
  )

  const listEmpty = useMemo(
    () =>
      hideEmptyState ? null : (
        <FolderEmptyState
          containerStyle={emptyStateStyle}
          hasSearchQuery={hasSearchQuery}
          meaningNotice={meaningNoticeText}
          isTrash={isTrashFolder}
          showOnboarding={localPreferences['isSynced'] !== true && !hasAnyNotes}
          onCreateNote={handleCreateNote}
          onLinkDevice={handleLinkDevice}
          onRestoreBackup={handleRestoreBackup}
        />
      ),
    [
      hideEmptyState,
      emptyStateStyle,
      hasSearchQuery,
      meaningNoticeText,
      isTrashFolder,
      localPreferences,
      hasAnyNotes,
      handleCreateNote,
      handleLinkDevice,
      handleRestoreBackup,
    ],
  )

  const listFooter = useMemo(
    () =>
      hasSearchQuery && notes.length > 0 && meaningRows.length === 0 && meaningNoticeText ? (
        <Text style={styles.meaningNotice}>{meaningNoticeText}</Text>
      ) : null,
    [hasSearchQuery, notes.length, meaningRows.length, meaningNoticeText, styles.meaningNotice],
  )

  const handleSearchChange = useCallback(
    (event: { nativeEvent: { text: string } }) =>
      dispatch(setSearchQuery(event.nativeEvent.text.slice(0, SEARCH_QUERY_MAX_LENGTH) as any)),
    [dispatch],
  )

  const handleSearchFocus = useCallback(() => dispatch(prewarmSearch()), [dispatch])

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
      headerTitle: !embedded && isTitleCollapsed ? headerTitle : '',
      headerLargeTitle: false,
      headerTransparent: true,
      headerLeft: embedded ? renderEmptyHeaderLeft : undefined,
      headerBackVisible: !embedded,
      scrollEdgeEffects: HIDDEN_SCROLL_EDGE_EFFECTS,
      headerSearchBarOptions: {
        ref: searchBarRef,
        placeholder: t('folderView.searchPlaceholder'),
        hideWhenScrolling: false,
        placement: embedded ? ('inline' as const) : ('automatic' as const),
        allowToolbarIntegration: !embedded,
        textColor: colors.text,
        hintTextColor: colors.textSecondary,
        headerIconColor: colors.textSecondary,
        onChangeText: handleSearchChange,
        onFocus: handleSearchFocus,
      },
    }),
    [
      t,
      colors.text,
      colors.textSecondary,
      handleSearchChange,
      handleSearchFocus,
      isTitleCollapsed,
      headerTitle,
      embedded,
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
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={scrollContentStyle}
        {...scrollProps}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={LIST_INITIAL_RENDER_COUNT}
        maxToRenderPerBatch={LIST_BATCH_RENDER_COUNT}
        windowSize={LIST_WINDOW_SIZE}
      />
      <ScreenEdgeFades />
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
      paddingTop: Space.sm,
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
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
    },
    meaningNotice: {
      marginHorizontal: Space.base,
      marginTop: Space.sm,
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
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
