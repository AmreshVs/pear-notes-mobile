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
import { Text, useTheme, View } from '@/components/Themed'
import { useNoteEditor } from '@/providers/NoteEditorProvider'

export default function FoldersScreen() {
  const { colors } = useTheme()
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

  const containerStyle = useMemo(
    () => [styles.container, { backgroundColor: colors.background }],
    [colors.background],
  )
  const iconBtnStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.5 : 1, padding: 8 }),
    [],
  )
  const sectionHeaderStyle = useMemo(() => [styles.sectionHeader, { color: '#8e8e93' }], [])

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
    <View style={containerStyle}>
      <Stack.Screen options={screenOptions} />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          {topFolders.map((folder: any) => (
            <FolderRow
              key={folder.id || folder.key}
              name={folder.name}
              count={folder.noteCount || 0}
              icon={getFolderIcon(folder)}
              isSystem={folder.isSystem}
              onPress={() => handleSelectFolder(folder.id || folder.key)}
              onRename={
                folder.isSystem
                  ? undefined
                  : () => handleRenameFolder(folder.id || folder.key, folder.name)
              }
              onDelete={
                folder.isSystem ? undefined : () => handleDeleteFolder(folder.id || folder.key)
              }
            />
          ))}
        </View>

        {archiveFolders.length > 0 && (
          <View style={styles.archiveSection}>
            <Text style={sectionHeaderStyle}>ARCHIVE</Text>
            {archiveFolders.map((folder: any) => (
              <FolderRow
                key={folder.id || folder.key}
                name={folder.name}
                count={folder.noteCount || 0}
                icon={getFolderIcon(folder)}
                isSystem={folder.isSystem}
                onPress={() => handleSelectFolder(folder.id || folder.key)}
                onRename={
                  folder.isSystem
                    ? undefined
                    : () => handleRenameFolder(folder.id || folder.key, folder.name)
                }
                onDelete={
                  folder.isSystem ? undefined : () => handleDeleteFolder(folder.id || folder.key)
                }
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    backgroundColor: 'rgba(255,255,255,0.2)',
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
  },
})
