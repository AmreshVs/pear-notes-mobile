import { MaterialCommunityIcons } from '@expo/vector-icons'
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
import {
  getHyperdriveAddress,
  getSearchQuery,
  setSearchQuery,
} from '@pear-notes/core/store/slices/uiSlice.js'
import { formatDate } from '@pear-notes/core/utils.js'
import * as Clipboard from 'expo-clipboard'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  FlatList,
  Image,
  ListRenderItemInfo,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import { Dialog, FAB, TextInput as PaperTextInput, Portal } from 'react-native-paper'
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'

import { BottomActionSheet } from '@/components/android/BottomActionSheet'
import { FolderPickerSheet } from '@/components/android/FolderPickerSheet'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { useNoteEditor } from '@/providers/NoteEditorContext'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerLow: string
  surfaceContainer: string
  surfaceContainerHigh: string
  surfaceContainerHighest: string
  onBackground: string
}

const getPreview = (html: string): string => {
  if (!html) return ''
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 120 ? text.substring(0, 120) + '…' : text
}

const getFirstImageUrl = (html: string): string | undefined => {
  if (!html) return undefined
  const divMatch =
    html.match(/<div[^>]*filetype="image\/[^"]*"[^>]*url="([^"]+)"[^>]*>/) ||
    html.match(/<div[^>]*url="([^"]+)"[^>]*filetype="image\/[^"]*"[^>]*>/)
  if (divMatch?.[1]) return divMatch[1].replace(/&amp;/g, '&')
  const imgMatch = html.match(/<img[^>]+src="([^"]+)"/)
  if (imgMatch?.[1]) return imgMatch[1].replace(/&amp;/g, '&')
  return undefined
}

const isChecklistNote = (html: string): boolean => !!html && html.includes('data-type="taskItem"')

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
  return hex.length === 7 ? `${hex}${a}` : hex
}

function noteKey(note: any): string {
  return note.key
}

export default function AndroidFolderNotesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const dispatch = useDispatch()
  const { openNote } = useNoteEditor()
  const theme = useMD3Theme()
  const c = theme.colors as ExtendedColors

  const allFolders = useSelector(getFolders) as any[]
  const notes = useSelector(getFilteredNotes) as any[]
  const searchQuery = useSelector(getSearchQuery) as string
  const selectedNote = useSelector(getSelectedNote) as string | null
  const localPreferences = useSelector(getLocalPreferences) as any

  const [searchVisible, setSearchVisible] = useState(false)
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [noteSheetVisible, setNoteSheetVisible] = useState(false)
  const [folderPickerVisible, setFolderPickerVisible] = useState(false)
  const [folderOptionsSheet, setFolderOptionsSheet] = useState(false)
  const [renameDialog, setRenameDialog] = useState<{ id: string; name: string } | null>(null)
  const [renameText, setRenameText] = useState('')

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
      openNote(selectedNote)
    }
  }, [selectedNote, openNote])

  useEffect(() => {
    if (selectedNote) lastSelectedNoteRef.current = selectedNote
  }, [selectedNote])

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
      if (isTrashFolder) {
        Alert.alert('Permanently Delete', 'This note cannot be recovered.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => dispatch(deleteNote(noteId as any)),
          },
        ])
      } else {
        dispatch(deleteNote(noteId as any))
      }
    },
    [dispatch, isTrashFolder],
  )

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
      const plain = [note.value?.title, getPreview(note.value?.note)].filter(Boolean).join('\n\n')
      await Clipboard.setStringAsync(plain)
    },
    [notes],
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
    handleDeleteNote(targetId)
  }, [activeNoteId, handleDeleteNote])

  const handleNoteSheetCopy = useCallback(async () => {
    if (!activeNoteId) return
    await handleCopyNote(activeNoteId)
    setNoteSheetVisible(false)
  }, [activeNoteId, handleCopyNote])

  const handleNoteSheetMove = useCallback(() => {
    setNoteSheetVisible(false)
    setFolderPickerVisible(true)
  }, [])

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
    Alert.alert('Delete Folder', 'This folder and its notes will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          dispatch(deleteFolder(id as any))
          router.back()
        },
      },
    ])
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

  const renderNote = useCallback(
    ({ item: note, index }: ListRenderItemInfo<any>) => (
      <AndroidNoteRow
        note={note}
        index={index}
        isLast={index === notes.length - 1}
        folderName={isAllNotes ? folderNameMap[note.value?.folderKey] : undefined}
        colors={c}
        onPress={handleSelectNote}
        onLongPress={handleNoteLongPress}
      />
    ),
    [notes.length, isAllNotes, folderNameMap, c, handleSelectNote, handleNoteLongPress],
  )

  const noteSheetActions = useMemo(
    () => [
      { icon: 'content-copy', label: 'Copy', onPress: handleNoteSheetCopy },
      ...(moveFolders.length > 0
        ? [{ icon: 'folder-move-outline', label: 'Move to Folder', onPress: handleNoteSheetMove }]
        : []),
      {
        icon: 'delete-outline',
        label: isTrashFolder ? 'Delete Permanently' : 'Delete',
        onPress: handleNoteSheetDelete,
        destructive: true as const,
      },
    ],
    [
      handleNoteSheetCopy,
      handleNoteSheetMove,
      handleNoteSheetDelete,
      moveFolders.length,
      isTrashFolder,
    ],
  )

  const dynamicStyles = useMemo(() => createDynamicStyles(c, insets.top), [c, insets.top])

  return (
    <View style={[staticStyles.root, { backgroundColor: c.background }]}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={c.background} />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[staticStyles.appBar, dynamicStyles.appBar]}>
        <View style={staticStyles.appBarLeft}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              staticStyles.iconBtn,
              pressed && {
                backgroundColor: hexWithAlpha(
                  (c as any).surfaceContainerHighest ?? c.surfaceVariant,
                  0.6,
                ),
              },
            ]}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={c.primary} />
          </Pressable>
        </View>

        <View style={staticStyles.appBarRight}>
          <Pressable
            onPress={toggleSearch}
            style={({ pressed }) => [
              staticStyles.iconBtn,
              pressed && {
                backgroundColor: hexWithAlpha(
                  (c as any).surfaceContainerHighest ?? c.surfaceVariant,
                  0.6,
                ),
              },
            ]}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name={searchVisible ? 'close' : 'magnify'}
              size={24}
              color={c.primary}
            />
          </Pressable>
          {!folder?.isSystem && (
            <Pressable
              onPress={() => setFolderOptionsSheet(true)}
              style={({ pressed }) => [
                staticStyles.iconBtn,
                pressed && {
                  backgroundColor: hexWithAlpha(
                    (c as any).surfaceContainerHighest ?? c.surfaceVariant,
                    0.6,
                  ),
                },
              ]}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="dots-vertical" size={24} color={c.primary} />
            </Pressable>
          )}
        </View>
      </View>

      <Animated.View style={[staticStyles.searchWrap, searchBarAnimStyle]}>
        <View
          style={[
            staticStyles.searchPill,
            {
              backgroundColor: c.surfaceContainer,
              borderColor: hexWithAlpha(c.outlineVariant, 0.15),
            },
          ]}
        >
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={c.onSurfaceVariant}
            style={staticStyles.searchIcon}
          />
          <TextInput
            ref={searchInputRef}
            style={[staticStyles.searchInput, { color: c.onSurface }]}
            placeholder="Search notes…"
            placeholderTextColor={c.onSurfaceVariant + '80'}
            value={searchQuery}
            onChangeText={(text) => dispatch(setSearchQuery(text))}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => dispatch(setSearchQuery(''))} hitSlop={8}>
              <MaterialCommunityIcons name="close-circle" size={16} color={c.onSurfaceVariant} />
            </Pressable>
          )}
        </View>
      </Animated.View>

      <FlatList
        data={notes}
        keyExtractor={noteKey}
        renderItem={renderNote}
        contentContainerStyle={[staticStyles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews
        ListHeaderComponent={
          <Text style={[staticStyles.pageTitle, { color: c.onBackground ?? c.onSurface }]}>
            {folder?.name || 'Notes'}
          </Text>
        }
        ListEmptyComponent={
          <EmptyState
            hasSearch={searchQuery.trim().length > 0}
            isSynced={localPreferences['isSynced'] === true}
            onLinkDevice={handleLinkDevice}
            height={height}
            colors={c}
          />
        }
      />

      <FAB
        icon="plus"
        onPress={handleCreateNote}
        style={[
          staticStyles.fab,
          { backgroundColor: c.primaryContainer, bottom: insets.bottom + 24 },
        ]}
        color={c.onPrimaryContainer}
        customSize={64}
      />

      <Portal>
        <Dialog
          visible={!!renameDialog}
          onDismiss={() => setRenameDialog(null)}
          style={{ backgroundColor: (c as any).surfaceContainerHighest ?? c.surface }}
        >
          <Dialog.Title style={{ color: c.onSurface }}>Rename Folder</Dialog.Title>
          <Dialog.Content>
            <PaperTextInput
              value={renameText}
              onChangeText={setRenameText}
              autoFocus
              mode="outlined"
              label="Folder name"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Pressable onPress={() => setRenameDialog(null)} style={staticStyles.dialogBtn}>
              <Text style={[staticStyles.dialogBtnText, { color: c.onSurfaceVariant }]}>
                Cancel
              </Text>
            </Pressable>
            <Pressable onPress={confirmRename} style={staticStyles.dialogBtn}>
              <Text style={[staticStyles.dialogBtnText, { color: c.primary }]}>Rename</Text>
            </Pressable>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <BottomActionSheet
        visible={noteSheetVisible}
        onDismiss={() => setNoteSheetVisible(false)}
        title={notes.find((n: any) => n.key === activeNoteId)?.value?.title || 'Untitled'}
        subtitle="Note options"
        actions={noteSheetActions}
      />

      <BottomActionSheet
        visible={folderOptionsSheet}
        onDismiss={() => setFolderOptionsSheet(false)}
        title={folder?.name ?? 'Folder'}
        subtitle="Folder options"
        actions={[
          { icon: 'pencil-outline', label: 'Rename', onPress: handleFolderSheetRename },
          {
            icon: 'delete-outline',
            label: 'Delete Folder',
            onPress: handleFolderSheetDelete,
            destructive: true,
          },
        ]}
      />

      <FolderPickerSheet
        visible={folderPickerVisible}
        onDismiss={() => setFolderPickerVisible(false)}
        folders={moveFolders.map((f: any) => ({ id: f.id, name: f.name }))}
        onSelect={handleConfirmMove}
      />
    </View>
  )
}

type NoteRowProps = {
  note: any
  index: number
  isLast: boolean
  folderName?: string
  colors: ExtendedColors
  onPress: (noteKey: string) => void
  onLongPress: (noteKey: string) => void
}

const AndroidNoteRow = memo(function AndroidNoteRow({
  note,
  index,
  isLast,
  folderName,
  colors: c,
  onPress,
  onLongPress,
}: NoteRowProps) {
  const title = note.value?.title || 'Untitled'
  const html = note.value?.note || ''
  const preview = getPreview(html)
  const rawImageUrl = getFirstImageUrl(html)
  const hasChecklist = isChecklistNote(html)
  const dateLabel = (formatDate(note.value?.updatedAt || note.value?.createdAt) || '').toUpperCase()

  const resolvedImageUrl = useSelector((state: any) => getHyperdriveAddress(state, rawImageUrl))
  const [thumbError, setThumbError] = useState(false)
  const showThumb = !!resolvedImageUrl && !thumbError

  const scale = useSharedValue(1)
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const handlePress = useCallback(() => onPress(note.key), [onPress, note.key])
  const handleLongPress = useCallback(() => onLongPress(note.key), [onLongPress, note.key])
  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.985, { damping: 20, stiffness: 400 })
  }, [scale])
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 16, stiffness: 300 })
  }, [scale])

  const thumbStyle = useMemo(
    () => ({
      backgroundColor: (c as any).surfaceContainerHigh ?? c.surfaceVariant,
      borderColor: hexWithAlpha(c.outlineVariant, 0.2),
    }),
    [c],
  )

  return (
    <Animated.View
      entering={FadeInDown.duration(200).delay(Math.min(index, 10) * 30)}
      exiting={FadeOutUp.duration(160)}
      layout={LinearTransition.springify().damping(20).stiffness(220)}
      style={animStyle}
    >
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          rowStyles.row,
          { backgroundColor: (c as any).surfaceContainerHigh ?? c.surfaceVariant },
          pressed && {
            backgroundColor: hexWithAlpha(
              (c as any).surfaceContainerHighest ?? c.surfaceVariant,
              0.6,
            ),
          },
        ]}
      >
        <View style={rowStyles.content}>
          <Text style={[rowStyles.title, { color: c.onSurface }]} numberOfLines={1}>
            {title}
          </Text>

          {hasChecklist && preview ? (
            <View style={rowStyles.checklistRow}>
              <MaterialCommunityIcons
                name="checkbox-blank-outline"
                size={13}
                color={hexWithAlpha(c.onSurfaceVariant, 0.6)}
                style={rowStyles.checkboxIcon}
              />
              <Text style={[rowStyles.preview, { color: c.onSurfaceVariant }]} numberOfLines={1}>
                {preview}
              </Text>
            </View>
          ) : (
            <Text style={[rowStyles.preview, { color: c.onSurfaceVariant }]} numberOfLines={1}>
              {preview}
            </Text>
          )}

          <View style={rowStyles.meta}>
            <Text style={[rowStyles.metaDate, { color: hexWithAlpha(c.onSurfaceVariant, 0.7) }]}>
              {dateLabel}
            </Text>
            {folderName && (
              <>
                <Text style={[rowStyles.metaDot, { color: hexWithAlpha(c.onSurfaceVariant, 0.5) }]}>
                  {'  •  '}
                </Text>
                <Text style={[rowStyles.metaTag, { color: hexWithAlpha(c.onSurfaceVariant, 0.7) }]}>
                  {folderName.toUpperCase()}
                </Text>
              </>
            )}
          </View>
        </View>

        {showThumb && (
          <Image
            source={{ uri: resolvedImageUrl }}
            style={[rowStyles.thumbnail, thumbStyle]}
            resizeMode="cover"
            onError={() => setThumbError(true)}
          />
        )}
      </Pressable>
    </Animated.View>
  )
})

type EmptyStateProps = {
  hasSearch: boolean
  isSynced: boolean
  onLinkDevice: () => void
  height: number
  colors: ExtendedColors
}

const EmptyState = memo(function EmptyState({
  hasSearch,
  isSynced,
  onLinkDevice,
  height,
  colors: c,
}: EmptyStateProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[emptyStyles.wrapper, { marginTop: height * 0.2 }]}
    >
      {hasSearch ? (
        <>
          <MaterialCommunityIcons
            name="text-search"
            size={48}
            color={hexWithAlpha(c.onSurfaceVariant, 0.3)}
          />
          <Text style={[emptyStyles.title, { color: c.onSurface }]}>No matches found</Text>
          <Text style={[emptyStyles.subtitle, { color: c.onSurfaceVariant }]}>
            Try a different search term
          </Text>
        </>
      ) : (
        <>
          <MaterialCommunityIcons
            name="file-document-outline"
            size={48}
            color={hexWithAlpha(c.onSurfaceVariant, 0.3)}
          />
          <Text style={[emptyStyles.title, { color: c.onSurface }]}>No Notes</Text>
          <Text style={[emptyStyles.subtitle, { color: c.onSurfaceVariant }]}>
            Tap + to create your first note
          </Text>
          {!isSynced && (
            <View style={emptyStyles.linkBox}>
              <View
                style={[
                  emptyStyles.divider,
                  { backgroundColor: hexWithAlpha(c.outlineVariant, 0.3) },
                ]}
              />
              <Text style={[emptyStyles.linkTitle, { color: c.onSurface }]}>
                LINK EXISTING DEVICE
              </Text>
              <Text style={[emptyStyles.linkSub, { color: c.onSurfaceVariant }]}>
                Already have notes elsewhere?
              </Text>
              <Pressable
                onPress={onLinkDevice}
                style={({ pressed }) => [
                  emptyStyles.linkBtn,
                  { backgroundColor: c.primaryContainer, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={[emptyStyles.linkBtnText, { color: c.onPrimaryContainer }]}>
                  Connect Device
                </Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </Animated.View>
  )
})

const createDynamicStyles = (c: ExtendedColors, topInset: number) => ({
  appBar: {
    paddingTop: topInset + 4,
    backgroundColor: c.background,
  },
})

const staticStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  appBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: 8,
    borderRadius: 9999,
  },
  searchWrap: {
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_400Regular',
    padding: 0,
  },
  pageTitle: {
    fontSize: 36,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: -0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  fab: {
    position: 'absolute',
    right: 24,
    borderRadius: 9999,
  },
  dialogBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dialogBtnText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
})

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginBottom: 8,
    borderRadius: 32,
    gap: 14,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  preview: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginBottom: 6,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  checkboxIcon: {
    marginRight: 5,
    marginTop: 1,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaDate: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 1,
  },
  metaDot: {
    fontSize: 10,
  },
  metaTag: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 1,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
})

const emptyStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    marginTop: 16,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_400Regular',
    textAlign: 'center',
  },
  linkBox: {
    width: '100%',
    marginTop: 40,
    alignItems: 'center',
  },
  divider: {
    width: 32,
    height: 3,
    borderRadius: 9999,
    marginBottom: 24,
  },
  linkTitle: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  linkSub: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginBottom: 20,
  },
  linkBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 9999,
    alignItems: 'center',
  },
  linkBtnText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
})
