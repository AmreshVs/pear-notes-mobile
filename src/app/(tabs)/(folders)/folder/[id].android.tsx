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
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import * as Clipboard from 'expo-clipboard'
import { router, Stack, useLocalSearchParams } from 'expo-router'

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

import { AndroidEmptyState, AndroidNoteRow, useMD3Theme } from '@/components/android'
import { BottomActionSheet } from '@/components/android/BottomActionSheet'
import { FolderPickerSheet } from '@/components/android/FolderPickerSheet'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_24,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_28,
  UI_SIZE_48,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'
import { toggleNoteLock } from '@/lib/noteLockActions'
import { buildNoteSections } from '@/utils/noteSections'
import { getPreview } from '@/utils/noteUtils'

function noteKey(note: any): string {
  return note.key
}

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
  const [deleteConfirmNote, setDeleteConfirmNote] = useState<string | null>(null)
  const [showFolderDeleteConfirm, setShowFolderDeleteConfirm] = useState(false)

  const creatingNoteRef = useRef(false)
  const lastSelectedNoteRef = useRef<string | null>(selectedNote)
  const searchInputRef = useRef<TextInput>(null)

  const searchBarHeight = useSharedValue(0)
  const searchBarOpacity = useSharedValue(0)

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

  const handleSelectNote = useCallback(
    (noteId: string) => {
      dispatch(setSelectedNote(noteId as any))
      router.push(`/note/${noteId}`)
    },
    [dispatch],
  )

  const handleCreateNote = useCallback(() => {
    creatingNoteRef.current = true
    dispatch(setSelectedFolder(id as any))
    dispatch(createNote({ title: '', note: '' } as any))
  }, [dispatch, id])

  const handleMoveNote = useCallback(
    (noteId: string, folderId: string) => {
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
    },
    [notes, t],
  )

  const handleNoteLongPress = useCallback(
    (noteId: string) => {
      const note = notes.find((n: any) => n.key === noteId)
      if (!note) return
      setActiveNoteId(noteId)
      setNoteSheetVisible(true)
    },
    [notes],
  )

  const handleNoteSheetDelete = useCallback(() => {
    if (!activeNoteId) return
    const targetId = activeNoteId
    setNoteSheetVisible(false)
    if (isTrashFolder) {
      setTimeout(() => setDeleteConfirmNote(targetId), 300)
    } else {
      dispatch(deleteNote(targetId as any))
    }
  }, [activeNoteId, isTrashFolder, dispatch])

  const handleNoteSheetCopy = useCallback(async () => {
    if (!activeNoteId) return
    await handleCopyNote(activeNoteId)
    setNoteSheetVisible(false)
  }, [activeNoteId, handleCopyNote])

  const handleNoteSheetMove = useCallback(() => {
    setNoteSheetVisible(false)
    setFolderPickerVisible(true)
  }, [])

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
    dispatch(deleteNote(deleteConfirmNote as any))
    setDeleteConfirmNote(null)
  }, [deleteConfirmNote, dispatch])

  const handleConfirmDeleteFolder = useCallback(() => {
    dispatch(deleteFolder(id as any))
    setShowFolderDeleteConfirm(false)
    router.back()
  }, [dispatch, id])

  const confirmRename = useCallback(() => {
    if (!renameDialog) return
    const trimmed = renameText.trim()
    if (trimmed && trimmed !== renameDialog.name) {
      dispatch(updateFolder({ id: renameDialog.id, name: trimmed } as any))
    }
    setRenameDialog(null)
  }, [dispatch, renameDialog, renameText])

  const handleLinkDevice = useCallback(() => {
    dispatch(setShowPairingInput(true))
  }, [dispatch])

  const handleRestoreBackup = useCallback(() => {
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
        onPress={handleSelectNote}
        onLongPress={handleNoteLongPress}
      />
    ),
    [isAllNotes, folderNameMap, handleSelectNote, handleNoteLongPress],
  )

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<any> }) =>
      section.title ? <Text style={styles.sectionCap}>{section.title}</Text> : null,
    [styles.sectionCap],
  )

  const noteSheetActions = useMemo(
    () => [
      ...(!isTrashFolder
        ? [
            {
              icon: activeNotePinned ? 'pin-off-outline' : 'pin-outline',
              label: activeNotePinned ? t('noteCard.actions.unpin') : t('noteCard.actions.pin'),
              onPress: handleNoteSheetTogglePin,
            },
          ]
        : []),
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
      ...(!isTrashFolder
        ? [
            {
              icon: activeNoteLocked ? 'lock-off-outline' : 'lock-outline',
              label: activeNoteLocked ? t('noteCard.actions.unlock') : t('noteCard.actions.lock'),
              onPress: handleNoteSheetToggleLock,
            },
          ]
        : []),
      {
        icon: 'delete-outline',
        label: isTrashFolder
          ? t('folderView.permanentlyDeleteTitle')
          : t('noteCard.actions.delete'),
        onPress: handleNoteSheetDelete,
        destructive: true as const,
      },
    ],
    [
      handleNoteSheetCopy,
      handleNoteSheetMove,
      handleNoteSheetDelete,
      handleNoteSheetToggleLock,
      handleNoteSheetTogglePin,
      activeNoteLocked,
      activeNotePinned,
      moveFolders.length,
      isTrashFolder,
      t,
    ],
  )

  const handleBack = useCallback(() => {
    router.back()
  }, [])

  const handleOpenFolderOptions = useCallback(() => {
    setFolderOptionsSheet(true)
  }, [])

  const handleClearSearch = useCallback(() => {
    dispatch(setSearchQuery(''))
  }, [dispatch])

  const handleCloseRenameDialog = useCallback(() => {
    setRenameDialog(null)
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
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={c.background}
      />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.appBar}>
        <View style={styles.appBarLeft}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            hitSlop={UI_SIZE_8}
          >
            <MaterialCommunityIcons name="arrow-left" size={UI_ICON_SIZE_24} color={c.primary} />
          </Pressable>
        </View>

        <View style={styles.appBarRight}>
          <Pressable
            onPress={toggleSearch}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            hitSlop={UI_SIZE_8}
          >
            <MaterialCommunityIcons
              name={searchVisible ? 'close' : 'magnify'}
              size={UI_ICON_SIZE_24}
              color={c.primary}
            />
          </Pressable>
          {!folder?.isSystem && (
            <Pressable
              onPress={handleOpenFolderOptions}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
              hitSlop={UI_SIZE_8}
            >
              <MaterialCommunityIcons
                name="dots-vertical"
                size={UI_ICON_SIZE_24}
                color={c.primary}
              />
            </Pressable>
          )}
        </View>
      </View>

      <Animated.View style={[styles.searchWrap, searchBarAnimStyle]}>
        <View style={styles.searchPill}>
          <MaterialCommunityIcons
            name="magnify"
            size={UI_ICON_SIZE_20}
            color={c.onSurfaceVariant}
            style={styles.searchIcon}
          />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder={t('folderView.searchPlaceholder')}
            placeholderTextColor={c.onSurfaceVariant + '80'}
            accessibilityLabel={t('folderView.searchPlaceholder')}
            value={searchQuery}
            onChangeText={(text) => dispatch(setSearchQuery(text))}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={handleClearSearch} hitSlop={UI_SIZE_8}>
              <MaterialCommunityIcons
                name="close-circle"
                size={UI_ICON_SIZE_16}
                color={c.onSurfaceVariant}
              />
            </Pressable>
          )}
        </View>
      </Animated.View>

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
        ListHeaderComponent={
          <View>
            <Text style={styles.pageTitle}>{folder?.name || t('folders.untitled')}</Text>
            <Text style={styles.pageCount} accessibilityLiveRegion="polite">
              {t('folderView.noteCount', { count: notes.length })}
            </Text>
          </View>
        }
        ListEmptyComponent={
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
        }
      />

      {!isTrashFolder && (
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
              onChangeText={setRenameText}
              autoFocus
              mode="outlined"
              label={t('folders.renameLabel')}
            />
            <View style={styles.dialogActions}>
              <Pressable onPress={handleCloseRenameDialog} style={styles.dialogBtn}>
                <Text style={styles.dialogBtnCancel}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable onPress={confirmRename} style={styles.dialogBtn}>
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
    appBar: {
      ...commonStyles.row,
      justifyContent: 'space-between',
      paddingHorizontal: UI_SIZE_8,
      paddingTop: insets.top + UI_SIZE_4,
      backgroundColor: c.background,
    },
    appBarLeft: {
      ...commonStyles.row,
      gap: UI_SIZE_4,
      ...commonStyles.flex1,
    },
    appBarRight: {
      ...commonStyles.row,
    },
    iconBtn: {
      padding: UI_SIZE_8,
      borderRadius: UI_SIZE_9999,
    },
    iconBtnPressed: {
      backgroundColor: hexWithAlpha(c.surfaceContainerHighest ?? c.surfaceVariant, 0.6),
    },
    searchWrap: {
      paddingHorizontal: UI_SIZE_20,
    },
    searchPill: {
      ...commonStyles.row,
      borderRadius: UI_SIZE_9999,
      paddingHorizontal: UI_SIZE_20,
      paddingVertical: UI_SIZE_14,
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor: c.surfaceContainer,
      borderColor: hexWithAlpha(c.outlineVariant, 0.15),
    },
    searchIcon: {
      marginRight: UI_SIZE_10,
    },
    searchInput: {
      ...commonStyles.flex1,
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.medium,
      paddingVertical: 0,
      color: c.onSurface,
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
    },
    pageCount: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.heavy,
      fontFamily: FontFamily.extraBold,
      letterSpacing: 1.2,
      color: c.onSurfaceVariant,
      marginBottom: UI_SIZE_4,
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
