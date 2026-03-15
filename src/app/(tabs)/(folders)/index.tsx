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
  const { colors, isDark } = useTheme()
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

  // Handle initial push to All Notes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      router.push(`/folder/${ALL_NOTES_KEY}` as any)
    }
  }, [])

  // Watch for selectedNote change after creation
  useEffect(() => {
    if (creatingNoteRef.current && selectedNote && selectedNote !== lastSelectedNoteRef.current) {
      creatingNoteRef.current = false
      lastSelectedNoteRef.current = selectedNote
      openNote(selectedNote)
    }
  }, [selectedNote])

  // Keep lastSelectedNoteRef in sync for manual selections
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

  const getFolderIcon = (folder: any) => {
    if (folder.isAll) return 'All'
    if (folder.isTrash) return 'Trash'
    return 'Folder'
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerTitle: 'Folders',
          headerTransparent: true,
          headerLargeTitle: true,
          headerLeft: () => (
            <Pressable
              onPress={() => router.push('/settings')}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 8 })}
            >
              <Text style={{ color: colors.primary, fontSize: 17 }}>Settings</Text>
            </Pressable>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Pressable
                onPress={handleCreateFolder}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 8 })}
              >
                <FolderPlus size={22} color={colors.primary} />
              </Pressable>
              <Pressable
                onPress={handleCreateNote}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 8 })}
              >
                <SquarePen size={22} color={colors.primary} strokeWidth={2} />
              </Pressable>
            </View>
          ),
        }}
      />

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
            <Text style={[styles.sectionHeader, { color: isDark ? '#8e8e93' : '#8e8e93' }]}>
              ARCHIVE
            </Text>
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
