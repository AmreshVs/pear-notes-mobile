import { ALL_NOTES_KEY } from '@pear-notes/core/constant.js'
import {
    createFolder,
    getFolders,
    setSelectedFolder,
} from '@pear-notes/core/store/slices/foldersSlice.js'
import { createNote, getSelectedNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { router, Stack } from 'expo-router'
import { FolderPlus, Link2, Settings, SquarePen } from 'lucide-react-native'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { FolderRow } from '@/components/FolderRow'
import { Text, useTheme, View } from '@/components/Themed'

export default function FoldersScreen() {
  const { colors, isDark } = useTheme()
  const dispatch = useDispatch()
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
      // Only push if we are exactly at the folders root
      // This allows the user to see All Notes by default but slide back
      router.push(`/folder/${ALL_NOTES_KEY}` as any)
    }
  }, [])

  // Watch for selectedNote change after creation
  useEffect(() => {
    if (creatingNoteRef.current && selectedNote && selectedNote !== lastSelectedNoteRef.current) {
      creatingNoteRef.current = false
      lastSelectedNoteRef.current = selectedNote
      router.push(`/note/${selectedNote}` as any)
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
          headerRight: () => (
            <Pressable
              onPress={handleCreateFolder}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 8 })}
            >
              <FolderPlus size={22} color={colors.primary} />
            </Pressable>
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
            <Text variant="caption" style={[styles.sectionHeader, { color: colors.textSecondary }]}>
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

      <View
        style={[
          styles.footer,
          {
            borderTopColor: colors.border,
            backgroundColor: isDark ? 'rgba(32, 32, 32, 0.95)' : 'rgba(242, 242, 247, 0.95)',
          },
        ]}
      >
        <View style={styles.footerContent}>
          <Pressable
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [styles.footerButton, { opacity: pressed ? 0.5 : 1 }]}
          >
            <Settings size={20} color={colors.textSecondary} />
            <Text style={[styles.footerButtonText, { color: colors.textSecondary }]}>Settings</Text>
          </Pressable>

          <View style={styles.footerActions}>
            <Pressable
              onPress={() => {}}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Link2 size={20} color={colors.primary} />
            </Pressable>

            <Pressable
              onPress={handleCreateNote}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <SquarePen size={20} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>
      </View>
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
    paddingTop: 12,
  },
  section: {
    backgroundColor: 'transparent',
  },
  archiveSection: {
    marginTop: 32,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 12,
    letterSpacing: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    paddingTop: 14,
    paddingHorizontal: 24,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
