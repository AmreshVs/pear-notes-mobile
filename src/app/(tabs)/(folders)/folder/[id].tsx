import { ALL_NOTES_KEY, RECENTLY_DELETED_KEY } from '@pear-notes/core/constant.js'
import { getFolders, setSelectedFolder } from '@pear-notes/core/store/slices/foldersSlice.js'
import {
  createNote,
  deleteNote,
  getFilteredNotes,
  getSelectedNote,
  setSelectedNote,
  updateNote,
} from '@pear-notes/core/store/slices/notesSlice.js'
import { setSearchQuery } from '@pear-notes/core/store/slices/uiSlice.js'
import { formatDate } from '@pear-notes/core/utils.js'
import * as Clipboard from 'expo-clipboard'
import { Stack, useLocalSearchParams } from 'expo-router'
import { SquarePen } from 'lucide-react-native'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { NoteCard } from '@/components/NoteCard'
import { Text, View, useTheme } from '@/components/Themed'
import { useNoteEditor } from '@/providers/NoteEditorProvider'

// Replace HTML tags with a space so words don't run together, then normalize whitespace
const getPreview = (html: string): string => {
  if (!html) return 'No additional text'
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 100 ? text.substring(0, 100) + '…' : text || 'No additional text'
}

const getFirstImageUrl = (html: string): string | undefined => {
  if (!html) return undefined

  const divMatch =
    html.match(/<div[^>]*filetype="image\/[^"]*"[^>]*url="([^"]+)"[^>]*>/) ||
    html.match(/<div[^>]*url="([^"]+)"[^>]*filetype="image\/[^"]*"[^>]*>/)
  if (divMatch?.[1]) {
    return divMatch[1].replace(/&amp;/g, '&')
  }

  const imgMatch = html.match(/<img[^>]+src="([^"]+)"/)
  if (imgMatch?.[1]) {
    return imgMatch[1].replace(/&amp;/g, '&')
  }
  return undefined
}

export default function FolderNotesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors, isDark } = useTheme()
  const dispatch = useDispatch()
  const { openNote } = useNoteEditor()
  const allFolders = useSelector(getFolders)
  const notes = useSelector(getFilteredNotes)
  const selectedNote = useSelector(getSelectedNote)

  const creatingNoteRef = useRef(false)
  const lastSelectedNoteRef = useRef<string | null>(selectedNote || null)

  const folder = useMemo(
    () => allFolders.find((f: any) => f.id === id || f.key === id),
    [allFolders, id],
  )

  const moveFolders = useMemo(
    () => allFolders.filter((f: any) => !f.isTrash && f.id !== ALL_NOTES_KEY && f.id !== id),
    [allFolders, id],
  )

  const groupedNotes = useMemo(() => {
    const sections: Record<string, any[]> = {
      Today: [],
      Yesterday: [],
      'Last 7 Days': [],
      Older: [],
    }
    const now = Date.now()
    const DAY = 86_400_000

    notes.forEach((note: any) => {
      const diff = now - (note.value?.updatedAt || note.value?.createdAt || 0)
      if (diff < DAY) sections['Today'].push(note)
      else if (diff < 2 * DAY) sections['Yesterday'].push(note)
      else if (diff < 7 * DAY) sections['Last 7 Days'].push(note)
      else sections['Older'].push(note)
    })

    return Object.entries(sections)
      .filter(([_, data]) => data.length > 0)
      .map(([title, data]) => ({ title, data }))
  }, [notes])

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
      const isTrash = id === RECENTLY_DELETED_KEY
      if (isTrash) {
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
    [dispatch, id],
  )

  const handleMoveNote = useCallback(
    (noteId: string, folderId: string) => {
      dispatch(updateNote({ key: noteId, folderKey: folderId } as any))
    },
    [dispatch],
  )

  const handleCopyNote = useCallback(async (title: string, html: string) => {
    const plain = [title, getPreview(html)].filter(Boolean).join('\n\n')
    await Clipboard.setStringAsync(plain)
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerTitle: folder?.name || 'Notes',
          headerLargeTitle: true,
          headerTransparent: true,
          headerBlurEffect: isDark ? 'dark' : 'light',
          headerRight: () => (
            <Pressable
              onPress={handleCreateNote}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 8 })}
            >
              <SquarePen size={22} color={colors.text} strokeWidth={1.8} />
            </Pressable>
          ),
          headerSearchBarOptions: {
            placeholder: 'Search notes...',
            hideWhenScrolling: false,
            textColor: colors.text,
            hintTextColor: colors.textSecondary,
            headerIconColor: colors.textSecondary,
            onChangeText: (event) => {
              dispatch(setSearchQuery(event.nativeEvent.text))
            },
          },
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerInfo}>
          <Text style={[styles.noteCount, { color: colors.textSecondary }]}>
            {notes.length} {notes.length === 1 ? 'NOTE' : 'NOTES'}
          </Text>
        </View>

        {groupedNotes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No Notes</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Tap the compose button to create one
            </Text>
          </View>
        ) : (
          groupedNotes.map((section) => (
            <View key={section.title} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  {section.title}
                </Text>
              </View>
              <View style={styles.listContainer}>
                {section.data.map((note, index) => (
                  <NoteCard
                    key={note.key}
                    id={note.key}
                    title={note.value?.title}
                    date={formatDate(note.value?.updatedAt || note.value?.createdAt)}
                    summary={getPreview(note.value?.note)}
                    rawImageUrl={getFirstImageUrl(note.value?.note)}
                    folderName={
                      folder?.id === ALL_NOTES_KEY
                        ? allFolders.find((f: any) => f.id === note.value?.folderKey)?.name
                        : undefined
                    }
                    selected={false}
                    isLast={index === section.data.length - 1}
                    onPress={() => handleSelectNote(note.key)}
                    onDelete={() => handleDeleteNote(note.key)}
                    onCopy={() => handleCopyNote(note.value?.title, note.value?.note)}
                    moveFolders={moveFolders}
                    onMoveTo={(folderId) => handleMoveNote(note.key, folderId)}
                  />
                ))}
              </View>
            </View>
          ))
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
  headerInfo: {
    marginLeft: 16,
    marginBottom: 12,
    marginTop: -4,
  },
  noteCount: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    opacity: 0.5,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    marginLeft: 16,
    paddingVertical: 8,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    opacity: 0.5,
  },
  listContainer: {
    backgroundColor: 'transparent',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 8,
    opacity: 0.6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.4,
    lineHeight: 20,
  },
})
