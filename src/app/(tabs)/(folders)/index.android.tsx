import { MaterialCommunityIcons } from '@expo/vector-icons'
import { ALL_NOTES_KEY } from '@pear-notes/core/constant.js'
import {
  createFolder,
  deleteFolder,
  getFolders,
  setSelectedFolder,
  updateFolder,
} from '@pear-notes/core/store/slices/foldersSlice.js'
import {
  getNoteCountsPerFolder,
  getSelectedNote,
} from '@pear-notes/core/store/slices/notesSlice.js'
import { router, Stack } from 'expo-router'
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Dialog, FAB, TextInput as PaperTextInput, Portal } from 'react-native-paper'
import Animated, {
  FadeIn,
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'

import { BottomActionSheet } from '@/components/android/BottomActionSheet'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { useNoteEditor } from '@/providers/NoteEditorContext'

type Folder = {
  id: string
  key?: string
  name: string
  isAll?: boolean
  isTrash?: boolean
  isSystem?: boolean
}

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerLow: string
  surfaceContainer: string
  surfaceContainerHigh: string
  surfaceContainerHighest: string
  surfaceContainerLowest: string
  surfaceTint: string
}

function useVaultColors() {
  const theme = useMD3Theme()
  const c = theme.colors as ExtendedColors
  return { theme, c }
}

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
  if (hex.length === 7) return `${hex}${a}`
  return hex
}

export default function AndroidFoldersScreen() {
  const { c } = useVaultColors()
  const insets = useSafeAreaInsets()
  const dispatch = useDispatch()
  const { openNote } = useNoteEditor()

  const folders = useSelector(getFolders) as Folder[]
  const noteCounts = useSelector(getNoteCountsPerFolder) as Record<string, number>
  const selectedNote = useSelector(getSelectedNote) as string | null

  const [searchQuery, setSearchQuery] = useState('')
  const [folderSheet, setFolderSheet] = useState<string | null>(null)
  const [renameDialog, setRenameDialog] = useState<{ id: string; name: string } | null>(null)
  const [renameText, setRenameText] = useState('')

  const creatingNoteRef = useRef(false)
  const lastSelectedNoteRef = useRef<string | null>(selectedNote)
  const isInitialMount = useRef(true)

  const topFolders = useMemo(
    () =>
      folders
        .filter((f) => !f.isTrash)
        .filter((f) => !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [folders, searchQuery],
  )

  const archiveFolders = useMemo(
    () =>
      folders
        .filter((f) => f.isTrash)
        .filter((f) => !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [folders, searchQuery],
  )

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      router.push(`/folder/${ALL_NOTES_KEY}` as any)
    }
  }, [])

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

  const handleSelectFolder = useCallback(
    (folderId: string) => {
      dispatch(setSelectedFolder(folderId as any))
      router.push(`/folder/${folderId}` as any)
    },
    [dispatch],
  )

  const handleCreateFolder = useCallback(() => {
    dispatch(createFolder({ name: 'Untitled' } as any))
  }, [dispatch])

  const openRenameDialog = useCallback((id: string, name: string) => {
    setRenameText(name)
    setRenameDialog({ id, name })
  }, [])

  const confirmRename = useCallback(() => {
    if (!renameDialog) return
    const trimmed = renameText.trim()
    if (trimmed && trimmed !== renameDialog.name) {
      dispatch(updateFolder({ id: renameDialog.id, name: trimmed } as any))
    }
    setRenameDialog(null)
  }, [dispatch, renameDialog, renameText])

  const handleFolderLongPress = useCallback(
    (folderId: string) => {
      const folder = folders.find((f) => f.id === folderId || f.key === folderId)
      if (!folder || folder.isSystem) return
      setFolderSheet(folderId)
    },
    [folders],
  )

  const handleSheetRename = useCallback(() => {
    if (!folderSheet) return
    const folder = folders.find((f) => f.id === folderSheet || f.key === folderSheet)
    if (!folder) return
    setFolderSheet(null)
    openRenameDialog(folderSheet, folder.name)
  }, [folderSheet, folders, openRenameDialog])

  const handleSheetDelete = useCallback(() => {
    if (!folderSheet) return
    const folderId = folderSheet
    setFolderSheet(null)
    Alert.alert('Delete Folder', 'This folder and its notes will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => dispatch(deleteFolder(folderId as any)),
      },
    ])
  }, [folderSheet, dispatch])

  const dynStyles = useMemo(() => createDynamicStyles(c, insets.bottom), [c, insets.bottom])

  return (
    <View style={dynStyles.root}>
      <StatusBar barStyle="light-content" backgroundColor={c.background} />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={staticStyles.scroll}
        contentContainerStyle={dynStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeIn.duration(200)} style={staticStyles.header}>
          <View>
            <Text style={dynStyles.pageTitle}>Folders</Text>
            <Text style={dynStyles.pageSubtitle}>Your note collections</Text>
          </View>
          <Pressable
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [staticStyles.gearBtn, pressed && dynStyles.gearBtnPressed]}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="cog-outline" size={24} color={c.onSurface} />
          </Pressable>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(220).delay(40)}
          style={staticStyles.searchWrap}
        >
          <View style={dynStyles.searchBar}>
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={c.onSurfaceVariant}
              style={staticStyles.searchIcon}
            />
            <TextInput
              style={dynStyles.searchInput}
              placeholder="Search folders…"
              placeholderTextColor={c.onSurfaceVariant + '80'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(240).delay(80)}
          layout={LinearTransition.springify().damping(20).stiffness(220)}
          style={dynStyles.listCard}
        >
          {topFolders.map((folder, index) => (
            <VaultFolderRow
              key={folder.id || folder.key}
              id={folder.id || folder.key!}
              name={folder.name}
              isAll={folder.isAll}
              isTrash={folder.isTrash}
              count={noteCounts[folder.id || folder.key!] ?? 0}
              isLast={index === topFolders.length - 1}
              colors={c}
              onPress={handleSelectFolder}
              onLongPress={handleFolderLongPress}
            />
          ))}

          {topFolders.length === 0 && (
            <View style={staticStyles.emptyRow}>
              <Text style={dynStyles.emptyText}>No folders found</Text>
            </View>
          )}
        </Animated.View>

        {archiveFolders.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(240).delay(120)}
            style={staticStyles.archiveSection}
          >
            <View style={staticStyles.sectionHeader}>
              <MaterialCommunityIcons name="archive-outline" size={20} color={c.onSurfaceVariant} />
              <Text style={dynStyles.sectionTitle}>Archive</Text>
            </View>
            <View style={dynStyles.listCard}>
              {archiveFolders.map((folder, index) => (
                <VaultFolderRow
                  key={folder.id || folder.key}
                  id={folder.id || folder.key!}
                  name={folder.name}
                  isAll={folder.isAll}
                  isTrash={folder.isTrash}
                  count={noteCounts[folder.id || folder.key!] ?? 0}
                  isLast={index === archiveFolders.length - 1}
                  colors={c}
                  onPress={handleSelectFolder}
                  onLongPress={handleFolderLongPress}
                />
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        onPress={handleCreateFolder}
        style={[dynStyles.fab, { bottom: insets.bottom + 24 }]}
        color={c.onPrimaryContainer}
        customSize={64}
        theme={{ colors: { primaryContainer: c.primaryContainer } }}
      />

      <Portal>
        <Dialog
          visible={!!renameDialog}
          onDismiss={() => setRenameDialog(null)}
          style={{ backgroundColor: c.surfaceContainerHighest ?? c.surface }}
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
        visible={!!folderSheet}
        onDismiss={() => setFolderSheet(null)}
        title={folders.find((f) => f.id === folderSheet || f.key === folderSheet)?.name ?? 'Folder'}
        subtitle="Folder options"
        actions={[
          { icon: 'pencil-outline', label: 'Rename', onPress: handleSheetRename },
          {
            icon: 'delete-outline',
            label: 'Delete',
            onPress: handleSheetDelete,
            destructive: true,
          },
        ]}
      />
    </View>
  )
}

type VaultFolderRowProps = {
  id: string
  name: string
  isAll?: boolean
  isTrash?: boolean
  count: number
  isLast: boolean
  colors: ExtendedColors
  onPress: (id: string) => void
  onLongPress: (id: string) => void
}

const VaultFolderRow = memo(function VaultFolderRow({
  id,
  name,
  isAll,
  isTrash,
  count,
  isLast,
  colors: c,
  onPress,
  onLongPress,
}: VaultFolderRowProps) {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePress = useCallback(() => onPress(id), [id, onPress])
  const handleLongPress = useCallback(() => onLongPress(id), [id, onLongPress])
  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 18, stiffness: 350 })
  }, [scale])
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 })
  }, [scale])

  const iconName = isAll ? 'folder-account' : isTrash ? 'delete-outline' : 'folder-outline'
  const iconColor = isTrash ? c.error : c.primary
  const iconBgColor = isTrash
    ? hexWithAlpha(c.errorContainer ?? '#871c34', 0.1)
    : hexWithAlpha(c.primaryContainer, 0.08)
  const countLabel = count > 0 ? `${count} ${count === 1 ? 'item' : 'items'}` : null

  const dividerStyle = useMemo(
    () =>
      !isLast
        ? {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: hexWithAlpha(c.outlineVariant, 0.2),
          }
        : null,
    [isLast, c.outlineVariant],
  )

  const getPressableStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      rowStyles.row,
      dividerStyle,
      pressed && { backgroundColor: hexWithAlpha(c.surfaceContainerHighest ?? c.surface, 0.5) },
    ],
    [dividerStyle, c.surfaceContainerHighest, c.surface],
  )

  return (
    <Animated.View
      style={animatedStyle}
      layout={LinearTransition.springify().damping(20).stiffness(220)}
    >
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={getPressableStyle}
      >
        <View style={rowStyles.rowLeft}>
          <View style={[rowStyles.iconWrap, { backgroundColor: iconBgColor }]}>
            <MaterialCommunityIcons name={iconName as any} size={22} color={iconColor} />
          </View>
          <Text style={[rowStyles.rowName, { color: c.onSurface }]}>{name}</Text>
        </View>
        <View style={rowStyles.rowRight}>
          {countLabel && (
            <View
              style={[
                rowStyles.countBadge,
                {
                  backgroundColor: hexWithAlpha(c.surfaceContainerHighest ?? c.surfaceVariant, 0.8),
                },
              ]}
            >
              <Text style={[rowStyles.countText, { color: c.onSurfaceVariant }]}>{countLabel}</Text>
            </View>
          )}
          <MaterialCommunityIcons
            name="chevron-right"
            size={18}
            color={hexWithAlpha(c.onSurfaceVariant, 0.5)}
          />
        </View>
      </Pressable>
    </Animated.View>
  )
})

const staticStyles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  gearBtn: {
    padding: 8,
    borderRadius: 9999,
    marginTop: -4,
  },
  searchWrap: {
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  archiveSection: {
    marginTop: 20,
  },
  emptyRow: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: 6,
  },
  dialogBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dialogBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
})

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 9999, // Perfect circle as per gold Note design screenshot
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_600SemiBold',
    flex: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
})

function createDynamicStyles(c: ExtendedColors, bottomInset: number) {
  return {
    root: {
      flex: 1,
      backgroundColor: c.background,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 52,
      paddingBottom: bottomInset + 100,
    },
    pageTitle: {
      fontSize: 36,
      fontWeight: '800' as const,
      fontFamily: 'PlusJakartaSans_800ExtraBold',
      letterSpacing: -0.5,
      color: c.onBackground ?? c.onSurface,
      marginBottom: 4,
    },
    pageSubtitle: {
      fontSize: 14,
      color: c.onSurfaceVariant,
      fontWeight: '400' as const,
      fontFamily: 'PlusJakartaSans_400Regular',
    },
    gearBtnPressed: {
      backgroundColor: hexWithAlpha(c.surfaceContainerHighest ?? c.surfaceVariant, 0.5),
    },
    searchBar: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: c.surfaceContainer,
      borderRadius: 9999,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hexWithAlpha(c.outlineVariant, 0.15),
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: c.onSurface,
      padding: 0,
    },
    listCard: {
      backgroundColor: c.surfaceContainer,
      borderRadius: 24,
      overflow: 'hidden' as const,
    },
    emptyText: {
      color: c.onSurfaceVariant,
      fontSize: 14,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      fontFamily: 'PlusJakartaSans_700Bold',
      color: c.onSurface,
    },
    fab: {
      position: 'absolute' as const,
      right: 24,
      backgroundColor: c.primaryContainer,
      borderRadius: 9999,
    },
  }
}
