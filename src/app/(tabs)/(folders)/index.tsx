import { ALL_NOTES_KEY } from '@pear-notes/core/constant.js'
import {
  createFolder,
  getFolders,
  setSelectedFolder,
} from '@pear-notes/core/store/slices/foldersSlice.js'
import { createNote, getSelectedNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { router, Stack } from 'expo-router'
import { FolderPlus, SquarePen } from 'lucide-react-native'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { Pressable, ScrollView, StyleSheet } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { FolderRow } from '@/components/FolderRow'
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

  const getFolderIcon = useCallback((folder: any) => {
    if (folder.isAll) return 'All'
    if (folder.isTrash) return 'Trash'
    return 'Folder'
  }, [])

  const containerStyle = useMemo(
    () => [styles.container, { backgroundColor: colors.background }],
    [colors.background],
  )
  const settingsBtnStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.5 : 1, padding: 8 }),
    [],
  )
  const settingsTextStyle = useMemo(
    () => ({ color: colors.primary, fontSize: 17 }),
    [colors.primary],
  )
  const headerRightStyle = useMemo(
    () => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 }),
    [],
  )
  const sectionHeaderStyle = useMemo(() => [styles.sectionHeader, { color: '#8e8e93' }], [])

  const headerLeft = useCallback(
    () => (
      <Pressable onPress={() => router.push('/settings')} style={settingsBtnStyle}>
        <Text style={settingsTextStyle}>Settings</Text>
      </Pressable>
    ),
    [settingsBtnStyle, settingsTextStyle],
  )

  const headerRight = useCallback(
    () => (
      <View style={headerRightStyle}>
        <Pressable onPress={handleCreateFolder} style={settingsBtnStyle}>
          <FolderPlus size={22} color={colors.primary} />
        </Pressable>
        <Pressable onPress={handleCreateNote} style={settingsBtnStyle}>
          <SquarePen size={22} color={colors.primary} strokeWidth={2} />
        </Pressable>
      </View>
    ),
    [headerRightStyle, handleCreateFolder, handleCreateNote, settingsBtnStyle, colors.primary],
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
              onPress={() => handleSelectFolder(folder.id || folder.key)}
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
                onPress={() => handleSelectFolder(folder.id || folder.key)}
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
    paddingHorizontal: 16,
    paddingTop: 8,
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
