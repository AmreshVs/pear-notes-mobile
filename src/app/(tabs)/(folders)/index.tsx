import { ALL_NOTES_KEY } from '@pear-notes/core/constant.js'
import {
  createFolder,
  deleteFolder,
  getFolders,
  setSelectedFolder,
  updateFolder,
} from '@pear-notes/core/store/slices/foldersSlice.js'
import { createNote, getSelectedNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { router, Stack } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { FolderPlus, SquarePen } from 'lucide-react-native'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { FolderRow } from '@/components/FolderRow'
import { GlassView } from '@/components/GlassView'
import { Text, Theme, useColors, useThemedStyles, View } from '@/components/Themed'
import { useNoteEditor } from '@/providers/NoteEditorProvider'

export default function FoldersScreen() {
  const styles = useThemedStyles(createStyles)
  const colors = useColors()
  const dispatch = useDispatch()
  const { openNote } = useNoteEditor()
  const folders = useSelector(getFolders)
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
    ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.5 : 1, padding: 8 }),
    [],
  )

  const headerLeft = useCallback(
    () => (
      <Pressable onPress={() => router.push('/settings')} style={iconBtnStyle}>
        <SymbolView
          name="gearshape"
          size={22}
          tintColor={colors.text}
          weight="regular"
          fallback={<View style={{ width: 22, height: 22 }} />}
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
        <View style={styles.pillDivider} />
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
          count={folder.noteCount || 0}
          icon={getFolderIcon(folder)}
          isSystem={folder.isSystem}
          onPress={handleSelectFolder}
          onRename={folder.isSystem ? undefined : handleRenameFolder}
          onDelete={folder.isSystem ? undefined : handleDeleteFolder}
        />
      )),
    [getFolderIcon, handleSelectFolder, handleRenameFolder, handleDeleteFolder],
  )

  const screenOptions = useMemo(
    () => ({
      headerTitle: 'Folders',
      headerTransparent: true,
      headerLargeTitle: true,
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
        <View style={styles.section}>{renderFolders(topFolders)}</View>

        {archiveFolders.length > 0 && (
          <View style={styles.archiveSection}>
            <Text style={styles.sectionHeader}>ARCHIVE</Text>
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
      paddingBottom: 120,
      paddingHorizontal: 0,
      paddingTop: 8,
    },
    headerPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    pillDivider: {
      width: StyleSheet.hairlineWidth,
      height: 16,
      backgroundColor: theme.colors.separator,
      marginHorizontal: 8,
    },
    section: {
      backgroundColor: 'transparent',
    },
    archiveSection: {
      marginTop: 28,
    },
    sectionHeader: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.5,
      marginBottom: 8,
      marginLeft: 16,
      textTransform: 'uppercase',
      opacity: 0.5,
      color: theme.colors.textSecondary,
    },
  })
