import { getFolders, setSelectedFolder } from '@pear-notes/core/store/slices/foldersSlice.js'
import {
  createNote,
  getFilteredNotes,
  getSelectedNote,
  setSelectedNote,
} from '@pear-notes/core/store/slices/notesSlice.js'
import { setSearchQuery } from '@pear-notes/core/store/slices/uiSlice.js'
import { format, isAfter, isToday, isYesterday, subDays } from 'date-fns'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { SquarePen } from 'lucide-react-native'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { Pressable, ScrollView, StyleSheet } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { NoteCard } from '@/components/NoteCard'
import { Text, View, useTheme } from '@/components/Themed'
import { useNoteEditor } from '@/providers/NoteEditorProvider'

export default function FolderNotesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors, isDark } = useTheme()
  const dispatch = useDispatch()
  const { openNote } = useNoteEditor()
  const folders = useSelector(getFolders)
  const notes = useSelector(getFilteredNotes)
  const selectedNote = useSelector(getSelectedNote)

  const creatingNoteRef = useRef(false)
  const lastSelectedNoteRef = useRef<string | null>(selectedNote || null)

  const folder = useMemo(() => folders.find((f: any) => f.id === id || f.key === id), [folders, id])

  const groupedNotes = useMemo(() => {
    const sections: Record<string, any[]> = {
      Today: [],
      Yesterday: [],
      'Last 7 Days': [],
      Older: [],
    }

    const now = new Date()
    const sevenDaysAgo = subDays(now, 7)

    notes.forEach((note: any) => {
      const date = new Date(note.value?.updatedAt || note.value?.createdAt || 0)
      if (isToday(date)) sections['Today'].push(note)
      else if (isYesterday(date)) sections['Yesterday'].push(note)
      else if (isAfter(date, sevenDaysAgo)) sections['Last 7 Days'].push(note)
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
    [dispatch],
  )

  const handleCreateNote = useCallback(() => {
    creatingNoteRef.current = true
    dispatch(setSelectedFolder(id as any))
    dispatch(createNote({ title: '', note: '' } as any))
  }, [dispatch, id])

  useEffect(() => {
    if (creatingNoteRef.current && selectedNote && selectedNote !== lastSelectedNoteRef.current) {
      creatingNoteRef.current = false
      lastSelectedNoteRef.current = selectedNote
      openNote(selectedNote)
    }
  }, [selectedNote])

  useEffect(() => {
    if (selectedNote) {
      lastSelectedNoteRef.current = selectedNote
    }
  }, [selectedNote])

  const getPreviewText = (html: string) => {
    if (!html) return 'No additional text'
    return html
      .replace(/<[^>]*>?/gm, '')
      .substring(0, 100)
      .trim()
  }

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
              <SquarePen size={22} color={colors.primary} strokeWidth={2} />
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
                    date={format(
                      new Date(note.value?.updatedAt || note.value?.createdAt || 0),
                      'h:mm a',
                    )}
                    summary={getPreviewText(note.value?.note)}
                    folderName={folder?.name === 'All Notes' ? note.value?.folderName : undefined}
                    selected={false}
                    isLast={index === section.data.length - 1}
                    onPress={() => handleSelectNote(note.key)}
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
    paddingHorizontal: 16,
  },
  headerInfo: {
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: -4,
  },
  noteCount: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    opacity: 0.5,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    paddingHorizontal: 20,
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
