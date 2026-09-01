import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Modal,
  Pressable,
  SectionList,
  SectionListData,
  SectionListRenderItemInfo,
  StatusBar,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import { FAB, TextInput as PaperTextInput } from 'react-native-paper'
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'
import * as Clipboard from 'expo-clipboard'
import { router, Stack, useLocalSearchParams } from 'expo-router'

import {
  ALL_NOTES_KEY,
  FOLDER_ERROR,
  FOLDER_NAME_MAX_LENGTH,
  RECENTLY_DELETED_KEY,
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
import { validateFolderName } from '@pear-notes/core/utils.js'

import { AndroidEmptyState, AndroidNoteRow, useMD3Theme } from '@/components/android'
import { AndroidFolderAppBar } from '@/components/android/AndroidFolderAppBar'
import { AndroidSelectionAppBar } from '@/components/android/AndroidSelectionAppBar'
import { BottomActionSheet } from '@/components/android/BottomActionSheet'
import { FolderPickerSheet } from '@/components/android/FolderPickerSheet'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_28,
  UI_SIZE_48,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import {
  LIST_BATCH_RENDER_COUNT,
  LIST_BATCHING_PERIOD_MS,
  LIST_INITIAL_RENDER_COUNT,
  LIST_WINDOW_SIZE,
} from '@/constants/constants'
import { androidRipple } from '@/lib/androidRipple'
import { hapticLight, hapticMedium, hapticSuccess, hapticWarning } from '@/lib/haptics'
import { toggleNoteLock } from '@/lib/noteLockActions'
import { buildNoteSections } from '@/utils/noteSections'
import { getPreview } from '@/utils/noteUtils'

import { useNoteSelection } from './useNoteSelection'

function noteKey(note: any): string {
  return note.key
}

const MIN_NOTES_FOR_MULTI_SELECT = 2

export default function AndroidFolderNotesScreen() {
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { height } = useWindowDimensions()
  const dispatch = useDispatch()
  const theme = useTheme()
  const md3 = useMD3Theme()
  const c = md3.colors
  const styles = useStyles()

  const allFolders = useSelector(getFolders) as any[]
  const notes = useSelector(getFilteredNotes) as any[]
  const lockMethod = useSelector(getLockMethod) as string
  const searchQuery = useSelector(getSearchQuery) as string
  const selectedNote = useSelector(getSelectedNote) as string | null
  const localPreferences = useSelector(getLocalPreferences) as any
  const allNotes = useSelector(getNotes) as any[]

  const [searchVisible, setSearchVisible] = useState(false)
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [noteSheetVisible, setNoteSheetVisible] = useState(false)
  const [folderPickerVisible, setFolderPickerVisible] = useState(false)
  const [folderOptionsSheet, setFolderOptionsSheet] = useState(false)
  const [renameDialog, setRenameDialog] = useState<{ id: string; name: string } | null>(null)
  const [renameText, setRenameText] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)
  const [deleteConfirmNote, setDeleteConfirmNote] = useState<string | null>(null)
  const [showFolderDeleteConfirm, setShowFolderDeleteConfirm] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [bulkFolderPickerVisible, setBulkFolderPickerVisible] = useState(false)

  const creatingNoteRef = useRef(false)
  const lastSelectedNoteRef = useRef<string | null>(selectedNote)
  const searchInputRef = useRef<TextInput>(null)

  const searchBarHeight = useSharedValue(0)
  const searchBarOpacity = useSharedValue(0)

  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])

  const folder = useMemo(
    () => allFolders.find((f: any) => f.id === id || f.key === id),
    [allFolders, id],
  )

  const moveFolders = useMemo(
    () => allFolders.filter((f: any) => !f.isTrash && f.id !== ALL_NOTES_KEY && f.id !== id),
    [allFolders, id],
  )

  const isTrashFolder = id === RECENTLY_DELETED_KEY
  const isAllNotes = folder?.id === ALL_NOTES_KEY

  const folderNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    allFolders.forEach((f: any) => {
      if (f.id) map[f.id] = f.name
    })
    return map
  }, [allFolders])

  const toggleSearch = useCallback(() => {
    const next = !searchVisible
    setSearchVisible(next)
    searchBarHeight.value = withTiming(next ? 64 : 0, { duration: 220 })
    searchBarOpacity.value = withTiming(next ? 1 : 0, { duration: 180 })
    if (!next) dispatch(setSearchQuery(''))
    else setTimeout(() => searchInputRef.current?.focus(), 150)
  }, [searchVisible, searchBarHeight, searchBarOpacity, dispatch])

  const searchBarAnimStyle = useAnimatedStyle(() => ({
    height: searchBarHeight.value,
    opacity: searchBarOpacity.value,
    overflow: 'hidden',
  }))

  useEffect(() => {
    return () => {
      dispatch(setSearchQuery(''))
    }
  }, [dispatch])

  useEffect(() => {
    if (creatingNoteRef.current && selectedNote && selectedNote !== lastSelectedNoteRef.current) {
      creatingNoteRef.current = false
      lastSelectedNoteRef.current = selectedNote
      router.push(`/note/${selectedNote}?isNew=1`)
    }
  }, [selectedNote])

  useEffect(() => {
    if (selectedNote) lastSelectedNoteRef.current = selectedNote
  }, [selectedNote])

  useEffect(() => {
    if (isTrashFolder) dispatch(purgeExpiredTrash())
  }, [isTrashFolder, dispatch])

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
  const canSearch = searchVisible || orderedKeys.length > 0

  const handleSelectNote = useCallback(
    (noteId: string) => {
      if (isSelecting) {
        hapticLight()
        toggleSelect(noteId)
        return
      }
      dispatch(setSelectedNote(noteId as any))
      router.push(`/note/${noteId}`)
    },
    [dispatch, isSelecting, toggleSelect],
  )

  const handleStartSelecting = useCallback(() => {
    hapticLight()
    startSelecting()
  }, [startSelecting])

  const handleToggleSelectAll = useCallback(() => {
    hapticLight()
    if (isAllSelected) {
      clearSelection()
      return
    }
    selectAll()
  }, [isAllSelected, clearSelection, selectAll])

  const handleOpenBulkMove = useCallback(() => {
    setBulkFolderPickerVisible(true)
  }, [])

  const handleCloseBulkMove = useCallback(() => {
    setBulkFolderPickerVisible(false)
  }, [])

  const handleConfirmBulkMove = useCallback(
    (folderId: string) => {
      hapticSuccess()
      dispatch(moveNotes({ keys: selectedKeys, folderKey: folderId } as any))
      setBulkFolderPickerVisible(false)
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

  const handleOpenBulkDelete = useCallback(() => {
    setShowBulkDeleteConfirm(true)
  }, [])

  const handleCloseBulkDelete = useCallback(() => {
    setShowBulkDeleteConfirm(false)
  }, [])

  const handleConfirmBulkDelete = useCallback(() => {
    hapticWarning()
    dispatch(deleteNotes(selectedKeys as any))
    setShowBulkDeleteConfirm(false)
    exitSelection()
  }, [dispatch, selectedKeys, exitSelection])

  const handleCreateNote = useCallback(() => {
    hapticLight()
    creatingNoteRef.current = true
    dispatch(setSelectedFolder(id as any))
    dispatch(createNote({ title: '', note: '' } as any))
  }, [dispatch, id])

  const handleMoveNote = useCallback(
    (noteId: string, folderId: string) => {
      hapticSuccess()
      dispatch(updateNote({ key: noteId, folderKey: folderId } as any))
    },
    [dispatch],
  )

  const handleCopyNote = useCallback(
    async (noteId: string) => {
      const note = notes.find((n: any) => n.key === noteId)
      if (!note) return
      const plain = [
        note.value?.title,
        getPreview(note.value?.note, t('noteCard.noAdditionalText')),
      ]
        .filter(Boolean)
        .join('\n\n')
      await Clipboard.setStringAsync(plain)
      hapticSuccess()
    },
    [notes, t],
  )

  const handleNoteLongPress = useCallback(
    (noteId: string) => {
      const note = notes.find((n: any) => n.key === noteId)
      if (!note) return
      hapticMedium()
      if (isSelecting) {
        toggleSelect(noteId)
        return
      }
      setActiveNoteId(noteId)
      setNoteSheetVisible(true)
    },
    [notes, isSelecting, toggleSelect],
  )

  const handleNoteSheetDelete = useCallback(() => {
    if (!activeNoteId) return
    const targetId = activeNoteId
    setNoteSheetVisible(false)
    if (isTrashFolder) {
      setTimeout(() => setDeleteConfirmNote(targetId), 300)
    } else {
      hapticWarning()
      dispatch(deleteNote(targetId as any))
    }
  }, [activeNoteId, isTrashFolder, dispatch])

  const handleNoteSheetSelect = useCallback(() => {
    if (!activeNoteId) return
    const targetId = activeNoteId
    setNoteSheetVisible(false)
    hapticLight()
    startSelecting(targetId)
  }, [activeNoteId, startSelecting])

  const handleNoteSheetCopy = useCallback(async () => {
    if (!activeNoteId) return
    await handleCopyNote(activeNoteId)
    setNoteSheetVisible(false)
  }, [activeNoteId, handleCopyNote])

  const handleNoteSheetMove = useCallback(() => {
    setNoteSheetVisible(false)
    setFolderPickerVisible(true)
  }, [])

  const handleNoteSheetRestore = useCallback(() => {
    if (!activeNoteId) return
    const targetId = activeNoteId
    setNoteSheetVisible(false)
    hapticSuccess()
    dispatch(restoreNote(targetId as any))
  }, [activeNoteId, dispatch])

  const activeNoteLocked = useMemo(
    () => notes.find((n: any) => n.key === activeNoteId)?.value?.locked === true,
    [notes, activeNoteId],
  )

  const activeNotePinned = useMemo(
    () => notes.find((n: any) => n.key === activeNoteId)?.value?.pinned === true,
    [notes, activeNoteId],
  )

  const handleNoteSheetToggleLock = useCallback(() => {
    if (!activeNoteId) return
    const targetId = activeNoteId
    setNoteSheetVisible(false)
    toggleNoteLock({
      key: targetId,
      currentlyLocked: activeNoteLocked,
      reason: t('noteCard.unlockReason'),
      dispatch,
      lockMethod,
    })
  }, [activeNoteId, activeNoteLocked, dispatch, lockMethod, t])

  const handleNoteSheetTogglePin = useCallback(() => {
    if (!activeNoteId) return
    const targetId = activeNoteId
    setNoteSheetVisible(false)
    hapticMedium()
    dispatch(updateNote({ key: targetId, pinned: !activeNotePinned } as any))
  }, [activeNoteId, activeNotePinned, dispatch])

  const handleConfirmMove = useCallback(
    (folderId: string) => {
      if (!activeNoteId) return
      handleMoveNote(activeNoteId, folderId)
      setFolderPickerVisible(false)
      setActiveNoteId(null)
    },
    [activeNoteId, handleMoveNote],
  )

  const handleFolderSheetRename = useCallback(() => {
    setFolderOptionsSheet(false)
    if (!folder) return
    setRenameText(folder.name)
    setRenameDialog({ id: folder.id, name: folder.name })
  }, [folder])

  const handleFolderSheetDelete = useCallback(() => {
    setFolderOptionsSheet(false)
    setShowFolderDeleteConfirm(true)
  }, [])

  const handleConfirmDeleteNote = useCallback(() => {
    if (!deleteConfirmNote) return
    hapticWarning()
    dispatch(deleteNote(deleteConfirmNote as any))
    setDeleteConfirmNote(null)
  }, [deleteConfirmNote, dispatch])

  const handleConfirmDeleteFolder = useCallback(() => {
    hapticWarning()
    dispatch(deleteFolder(id as any))
    setShowFolderDeleteConfirm(false)
    router.back()
  }, [dispatch, id])

  const handleChangeRenameText = useCallback((value: string) => {
    setRenameText(value)
    setRenameError(null)
  }, [])

  const confirmRename = useCallback(() => {
    if (!renameDialog) return
    const result = validateFolderName(allFolders, renameText, renameDialog.id)
    if (!result.valid) {
      hapticWarning()
      setRenameError(
        result.error === FOLDER_ERROR.DUPLICATE_NAME
          ? t('folders.errors.duplicateName', { name: result.name })
          : t('folders.errors.emptyName'),
      )
      return
    }
    if (result.name !== renameDialog.name) {
      hapticSuccess()
      dispatch(updateFolder({ id: renameDialog.id, name: result.name } as any))
    }
    setRenameDialog(null)
  }, [allFolders, dispatch, renameDialog, renameText, t])

  const handleLinkDevice = useCallback(() => {
    hapticLight()
    dispatch(setShowPairingInput(true))
  }, [dispatch])

  const handleRestoreBackup = useCallback(() => {
    hapticLight()
    router.push('/settings/backup')
  }, [])

  const sections = useMemo(
    () => buildNoteSections(notes, t, isTrashFolder),
    [notes, t, isTrashFolder],
  )

  const renderNote = useCallback(
    ({ item: note, index, section }: SectionListRenderItemInfo<any>) => (
      <AndroidNoteRow
        note={note}
        index={index}
        isLast={index === section.data.length - 1}
        folderName={isAllNotes ? folderNameMap[note.value?.folderKey] : undefined}
        sectionTitle={section.title}
        selecting={isSelecting}
        checked={selectedKeys.includes(note.key)}
        onPress={handleSelectNote}
        onLongPress={handleNoteLongPress}
      />
    ),
    [isAllNotes, folderNameMap, isSelecting, selectedKeys, handleSelectNote, handleNoteLongPress],
  )

  const listHeader = useMemo(
    () => (
      <View>
        <Text style={styles.pageTitle} numberOfLines={2}>
          {folder?.name || t('folders.untitled')}
        </Text>
        <Text style={styles.pageCount}>{t('folderView.noteCount', { count: notes.length })}</Text>
        {isTrashFolder && notes.length > 0 && (
          <Text style={styles.retentionNotice}>
            {t('folderView.trashRetentionNotice', { days: TRASH_RETENTION_DAYS })}
          </Text>
        )}
      </View>
    ),
    [
      folder?.name,
      notes.length,
      isTrashFolder,
      t,
      styles.pageTitle,
      styles.pageCount,
      styles.retentionNotice,
    ],
  )

  const listEmpty = useMemo(
    () => (
      <AndroidEmptyState
        hasSearch={searchQuery.trim().length > 0}
        isOnboarding={
          !isTrashFolder && localPreferences['isSynced'] !== true && allNotes.length === 0
        }
        isTrash={isTrashFolder}
        onLinkDevice={handleLinkDevice}
        onCreateNote={handleCreateNote}
        onRestoreBackup={handleRestoreBackup}
        height={height}
      />
    ),
    [
      searchQuery,
      isTrashFolder,
      localPreferences,
      allNotes.length,
      handleLinkDevice,
      handleCreateNote,
      handleRestoreBackup,
      height,
    ],
  )

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<any> }) =>
      section.title ? <Text style={styles.sectionCap}>{section.title}</Text> : null,
    [styles.sectionCap],
  )

  const trashNoteSheetActions = useMemo(
    () => [
      {
        icon: 'backup-restore',
        label: t('noteCard.actions.restore'),
        onPress: handleNoteSheetRestore,
      },
      {
        icon: 'delete-outline',
        label: t('folderView.permanentlyDeleteTitle'),
        onPress: handleNoteSheetDelete,
        destructive: true as const,
      },
    ],
    [handleNoteSheetRestore, handleNoteSheetDelete, t],
  )

  const folderNoteSheetActions = useMemo(
    () => [
      {
        icon: 'checkbox-multiple-marked-outline',
        label: t('folderView.selection.select'),
        onPress: handleNoteSheetSelect,
      },
      {
        icon: activeNotePinned ? 'pin-off-outline' : 'pin-outline',
        label: activeNotePinned ? t('noteCard.actions.unpin') : t('noteCard.actions.pin'),
        onPress: handleNoteSheetTogglePin,
      },
      { icon: 'content-copy', label: t('noteCard.actions.copyNote'), onPress: handleNoteSheetCopy },
      ...(moveFolders.length > 0
        ? [
            {
              icon: 'folder-move-outline',
              label: t('noteCard.actions.moveTo'),
              onPress: handleNoteSheetMove,
            },
          ]
        : []),
      {
        icon: activeNoteLocked ? 'lock-off-outline' : 'lock-outline',
        label: activeNoteLocked ? t('noteCard.actions.unlock') : t('noteCard.actions.lock'),
        onPress: handleNoteSheetToggleLock,
      },
      {
        icon: 'delete-outline',
        label: t('noteCard.actions.delete'),
        onPress: handleNoteSheetDelete,
        destructive: true as const,
      },
    ],
    [
      handleNoteSheetSelect,
      handleNoteSheetCopy,
      handleNoteSheetMove,
      handleNoteSheetDelete,
      handleNoteSheetToggleLock,
      handleNoteSheetTogglePin,
      activeNoteLocked,
      activeNotePinned,
      moveFolders.length,
      t,
    ],
  )

  const noteSheetActions = isTrashFolder ? trashNoteSheetActions : folderNoteSheetActions

  const handleBack = useCallback(() => {
    router.back()
  }, [])

  const handleOpenFolderOptions = useCallback(() => {
    setFolderOptionsSheet(true)
  }, [])

  const handleClearSearch = useCallback(() => {
    dispatch(setSearchQuery(''))
  }, [dispatch])

  const handleChangeSearch = useCallback(
    (text: string) => {
      dispatch(setSearchQuery(text))
    },
    [dispatch],
  )

  const handleCloseRenameDialog = useCallback(() => {
    setRenameDialog(null)
    setRenameError(null)
  }, [])

  const handleCloseFolderPicker = useCallback(() => {
    setFolderPickerVisible(false)
  }, [])

  const handleCloseFolderOptions = useCallback(() => {
    setFolderOptionsSheet(false)
  }, [])

  const deleteNoteConfirmActions = useMemo(
    () => [
      {
        icon: 'delete-outline',
        label: t('folders.buttons.delete'),
        onPress: handleConfirmDeleteNote,
        destructive: true,
      },
    ],
    [handleConfirmDeleteNote, t],
  )

  const bulkDeleteConfirmActions = useMemo(
    () => [
      {
        icon: 'delete-outline',
        label: t('folders.buttons.delete'),
        onPress: handleConfirmBulkDelete,
        destructive: true,
      },
    ],
    [handleConfirmBulkDelete, t],
  )

  const deleteFolderConfirmActions = useMemo(
    () => [
      {
        icon: 'delete-outline',
        label: t('folders.buttons.delete'),
        onPress: handleConfirmDeleteFolder,
        destructive: true,
      },
    ],
    [handleConfirmDeleteFolder, t],
  )

  return (
    <View style={styles.root}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <Stack.Screen options={{ headerShown: false }} />

      {isSelecting ? (
        <AndroidSelectionAppBar
          selectedCount={selectedCount}
          isAllSelected={isAllSelected}
          isTrash={isTrashFolder}
          canMove={moveFolders.length > 0}
          onClose={exitSelection}
          onToggleSelectAll={handleToggleSelectAll}
          onMove={handleOpenBulkMove}
          onRestore={handleBulkRestore}
          onDelete={handleOpenBulkDelete}
        />
      ) : (
        <AndroidFolderAppBar
          searchVisible={searchVisible}
          searchQuery={searchQuery}
          showFolderOptions={!folder?.isSystem}
          canMultiSelect={canMultiSelect}
          canSearch={canSearch}
          searchInputRef={searchInputRef}
          searchBarStyle={searchBarAnimStyle}
          onBack={handleBack}
          onStartSelecting={handleStartSelecting}
          onToggleSearch={toggleSearch}
          onOpenFolderOptions={handleOpenFolderOptions}
          onChangeSearch={handleChangeSearch}
          onClearSearch={handleClearSearch}
        />
      )}

      <SectionList
        sections={sections}
        keyExtractor={noteKey}
        renderItem={renderNote}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews
        initialNumToRender={LIST_INITIAL_RENDER_COUNT}
        maxToRenderPerBatch={LIST_BATCH_RENDER_COUNT}
        windowSize={LIST_WINDOW_SIZE}
        updateCellsBatchingPeriod={LIST_BATCHING_PERIOD_MS}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
      />

      {!isTrashFolder && !isSelecting && (
        <FAB
          icon="plus"
          onPress={handleCreateNote}
          style={styles.fab}
          color={c.onPrimaryContainer}
          customSize={64}
        />
      )}

      <Modal
        visible={!!renameDialog}
        transparent
        animationType="fade"
        onRequestClose={handleCloseRenameDialog}
        statusBarTranslucent
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseRenameDialog}>
          <Pressable style={styles.renameDialog} onPress={() => {}}>
            <Text style={styles.dialogTitle}>{t('folders.renameTitle')}</Text>
            <PaperTextInput
              value={renameText}
              onChangeText={handleChangeRenameText}
              onSubmitEditing={confirmRename}
              autoFocus
              mode="outlined"
              error={!!renameError}
              maxLength={FOLDER_NAME_MAX_LENGTH}
              label={t('folders.renameLabel')}
            />
            {!!renameError && <Text style={styles.dialogError}>{renameError}</Text>}
            <View style={styles.dialogActions}>
              <Pressable
                onPress={handleCloseRenameDialog}
                android_ripple={ripple}
                style={styles.dialogBtn}
              >
                <Text style={styles.dialogBtnCancel}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable onPress={confirmRename} android_ripple={ripple} style={styles.dialogBtn}>
                <Text style={styles.dialogBtnRename}>{t('folders.buttons.rename')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <BottomActionSheet
        visible={noteSheetVisible}
        onDismiss={() => setNoteSheetVisible(false)}
        title={
          notes.find((n: any) => n.key === activeNoteId)?.value?.title || t('noteCard.untitled')
        }
        subtitle={t('noteCard.actions.options')}
        actions={noteSheetActions}
      />

      <BottomActionSheet
        visible={folderOptionsSheet}
        onDismiss={handleCloseFolderOptions}
        title={folder?.name ?? t('folders.untitled')}
        subtitle={t('folders.options')}
        actions={[
          {
            icon: 'pencil-outline',
            label: t('folders.buttons.rename'),
            onPress: handleFolderSheetRename,
          },
          {
            icon: 'delete-outline',
            label: t('folders.deleteTitle'),
            onPress: handleFolderSheetDelete,
            destructive: true,
          },
        ]}
      />

      <FolderPickerSheet
        visible={folderPickerVisible}
        onDismiss={handleCloseFolderPicker}
        folders={moveFolders.map((f: any) => ({ id: f.id, name: f.name }))}
        onSelect={handleConfirmMove}
      />

      <FolderPickerSheet
        visible={bulkFolderPickerVisible}
        onDismiss={handleCloseBulkMove}
        folders={moveFolders.map((f: any) => ({ id: f.id, name: f.name }))}
        onSelect={handleConfirmBulkMove}
      />

      <BottomActionSheet
        visible={showBulkDeleteConfirm}
        onDismiss={handleCloseBulkDelete}
        title={
          isTrashFolder
            ? t('folderView.selection.confirmPermanentDeleteTitle', { count: selectedCount })
            : t('folderView.selection.confirmDeleteTitle', { count: selectedCount })
        }
        subtitle={
          isTrashFolder
            ? t('folderView.selection.confirmPermanentDeleteBody')
            : t('folderView.selection.confirmDeleteBody', { days: TRASH_RETENTION_DAYS })
        }
        actions={bulkDeleteConfirmActions}
      />

      <BottomActionSheet
        visible={!!deleteConfirmNote}
        onDismiss={() => setDeleteConfirmNote(null)}
        title={t('folderView.permanentlyDeleteTitle')}
        subtitle={t('folderView.permanentlyDeleteSubtitle')}
        actions={deleteNoteConfirmActions}
      />

      <BottomActionSheet
        visible={showFolderDeleteConfirm}
        onDismiss={() => setShowFolderDeleteConfirm(false)}
        title={t('folders.deleteTitle')}
        subtitle={t('folders.deleteDescription')}
        actions={deleteFolderConfirmActions}
      />
    </View>
  )
}

const useFolderHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  return { md3, insets, width, height }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3, insets, width, height }) => {
  const c = md3.colors as any
  const styles = StyleSheet.create({
    root: {
      ...commonStyles.flex1,
      backgroundColor: c.background,
    },
    listContent: {
      paddingHorizontal: UI_SIZE_20,
      paddingTop: UI_SIZE_10,
      paddingBottom: insets.bottom + 100,
    },
    pageTitle: {
      fontSize: FontSize.heading,
      fontWeight: FontWeight.heavy,
      fontFamily: FontFamily.extraBold,
      marginBottom: UI_SIZE_4,
      marginTop: UI_SIZE_10,
      letterSpacing: -0.5,
      color: c.onSurface,
      paddingRight: UI_SIZE_16,
    },
    pageCount: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.heavy,
      fontFamily: FontFamily.extraBold,
      letterSpacing: 1.2,
      color: c.onSurfaceVariant,
      marginBottom: UI_SIZE_4,
    },
    retentionNotice: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.medium,
      fontWeight: FontWeight.medium,
      color: c.onSurfaceVariant,
      lineHeight: FontSize.caption * 1.4,
      marginBottom: UI_SIZE_12,
    },
    sectionCap: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.heavy,
      fontFamily: FontFamily.extraBold,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      color: c.onSurfaceVariant,
      marginBottom: UI_SIZE_12,
      marginTop: UI_SIZE_4,
    },
    fab: {
      position: 'absolute',
      right: UI_SIZE_24,
      borderRadius: UI_SIZE_9999,
      elevation: 4,
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
      backgroundColor: c.primaryContainer,
      bottom: insets.bottom + UI_SIZE_24,
    },
    modalOverlay: {
      ...commonStyles.flex1,
      backgroundColor: theme.colors.backdrop,
      ...commonStyles.centered,
    },
    renameDialog: {
      backgroundColor: c.surfaceContainerHighest ?? c.surface,
      borderRadius: UI_SIZE_28,
      padding: UI_SIZE_24,
      width: Math.min(width - UI_SIZE_48, 400),
      elevation: 6,
      boxShadow: '0 3px 8px rgba(0, 0, 0, 0.2)',
    },
    dialogTitle: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      marginBottom: UI_SIZE_16,
      color: c.onSurface,
    },
    dialogError: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      marginTop: UI_SIZE_8,
      color: c.error,
    },
    dialogActions: {
      ...commonStyles.row,
      justifyContent: 'flex-end',
      marginTop: UI_SIZE_16,
      gap: UI_SIZE_4,
    },
    dialogBtn: {
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_10,
    },
    dialogBtnCancel: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurfaceVariant,
    },
    dialogBtnRename: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.primary,
    },
  })
  return styles
}, useFolderHooks)
