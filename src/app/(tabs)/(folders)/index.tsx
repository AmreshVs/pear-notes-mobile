import { ALL_NOTES_KEY } from '@pear-notes/core/constant.js'
import {
  createFolder,
  deleteFolder,
  getFolders,
  setSelectedFolder,
  updateFolder,
} from '@pear-notes/core/store/slices/foldersSlice.js'
import {
  createNote,
  getNoteCountsPerFolder,
  getSelectedNote,
} from '@pear-notes/core/store/slices/notesSlice.js'
import { router, Stack } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { FolderPlus, SquarePen } from 'lucide-react-native'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { FolderRow } from '@/components/FolderRow'
import { GlassView } from '@/components/GlassView'
import { Text, Theme, useColors, useThemedStyles, View } from '@/components/Themed'
import {
  FontSize,
  FontWeight,
  LetterSpacing,
  Space,
  useCommonStyles,
} from '@/constants/commonStyles'
import { useNoteEditor } from '@/providers/NoteEditorProvider'

export default function FoldersScreen() {
  const styles = useThemedStyles(createStyles)
  const common = useCommonStyles()
  const colors = useColors()
  const dispatch = useDispatch()
  const { openNote } = useNoteEditor()
  const folders = useSelector(getFolders)
  const noteCounts = useSelector(getNoteCountsPerFolder) as Record<string, number>
  const selectedNote = useSelector(getSelectedNote)

  const creatingNoteRef = useRef(false)
  const lastSelectedNoteRef = useRef<string | null>(selectedNote || null)
  const isInitialMount = useRef(true)

  const topFolders = useMemo(() => folders.filter((f: any) => !f.isTrash), [folders])
  const archiveFolders = useMemo(() => folders.filter((f: any) => f.isTrash), [folders])

  const handleCreateNote = useCallback(() => {
    creatingNoteRef.current = true
    dispatch(createNote({ title: '', note: '' } as any))
  }, [dispatch])

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
    if (selectedNote) {
      lastSelectedNoteRef.current = selectedNote
    }
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

  const handleRenameFolder = useCallback(
    (folderId: string, currentName: string) => {
      Alert.prompt(
        'Rename Folder',
        undefined,
        (newName) => {
          const trimmed = newName?.trim()
          if (trimmed && trimmed !== currentName) {
            dispatch(updateFolder({ id: folderId, name: trimmed } as any))
          }
        },
        'plain-text',
        currentName,
      )
    },
    [dispatch],
  )

  const handleDeleteFolder = useCallback(
    (folderId: string) => {
      Alert.alert('Delete Folder', 'This folder and its notes will be deleted.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch(deleteFolder(folderId as any)),
        },
      ])
    },
    [dispatch],
  )

  const getFolderIcon = useCallback((folder: any) => {
    if (folder.isAll) return 'All'
    if (folder.isTrash) return 'Trash'
    return 'Folder'
  }, [])

  const iconBtnStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [styles.iconBtn, pressed && common.pressed],
    [styles.iconBtn, common.pressed],
  )

  const headerLeft = useCallback(
    () => (
      <Pressable onPress={() => router.push('/settings')} style={iconBtnStyle}>
        <SymbolView
          name="gearshape"
          size={22}
          tintColor={colors.text}
          weight="regular"
          fallback={<View style={styles.fallbackIcon} />}
        />
      </Pressable>
    ),
    [iconBtnStyle, colors.text],
  )

  const headerRight = useCallback(
    () => (
      <GlassView intensity={20} borderRadius={24} style={styles.headerPill}>
        <Pressable onPress={handleCreateFolder} style={iconBtnStyle}>
          <FolderPlus size={20} color={colors.text} strokeWidth={1.8} />
        </Pressable>
        <View style={common.pillDivider} />
        <Pressable onPress={handleCreateNote} style={iconBtnStyle}>
          <SquarePen size={20} color={colors.text} strokeWidth={1.8} />
        </Pressable>
      </GlassView>
    ),
    [handleCreateFolder, handleCreateNote, iconBtnStyle, colors.text],
  )

  const renderFolders = useCallback(
    (foldersToRender: any[]) =>
      foldersToRender.map((folder: any) => (
        <FolderRow
          key={folder.id || folder.key}
          id={folder.id || folder.key}
          name={folder.name}
          count={noteCounts[folder.id || folder.key] ?? 0}
          icon={getFolderIcon(folder)}
          isSystem={folder.isSystem}
          onPress={handleSelectFolder}
          onRename={folder.isSystem ? undefined : handleRenameFolder}
          onDelete={folder.isSystem ? undefined : handleDeleteFolder}
        />
      )),
    [noteCounts, getFolderIcon, handleSelectFolder, handleRenameFolder, handleDeleteFolder],
  )

  const screenOptions = useMemo(
    () => ({
      headerTitle: '',
      headerTransparent: true,
      headerLargeTitle: false,
      headerLeft,
      headerRight,
    }),
    [headerLeft, headerRight],
  )

  return (
    <View style={styles.container}>
      <Stack.Screen options={screenOptions} />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.pageTitle}>Folders</Text>
        <View style={styles.section}>{renderFolders(topFolders)}</View>

        {archiveFolders.length > 0 && (
          <View style={styles.archiveSection}>
            <Text style={[common.sectionCap, styles.sectionHeaderMargin]}>ARCHIVE</Text>
            {renderFolders(archiveFolders)}
          </View>
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
      paddingBottom: Space.scrollBottom,
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
      marginBottom: Space.sm,
    },
    headerPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Space.sm,
    },
    section: {
      backgroundColor: 'transparent',
    },
    archiveSection: {
      marginTop: Space.xxl,
    },
    sectionHeaderMargin: {
      marginBottom: Space.sm,
      marginLeft: Space.base,
    },
    iconBtn: {
      padding: Space.sm,
    },
    fallbackIcon: {
      width: 22,
      height: 22,
    },
  })
