import { getFilteredNotes, setSelectedNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { setSearchQuery } from '@pear-notes/core/store/slices/uiSlice.js'
import { format } from 'date-fns'
import { Stack, router } from 'expo-router'
import React, { useCallback } from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { NoteCard } from '@/components/NoteCard'
import { Text, View, useTheme } from '@/components/Themed'

export default function SearchScreen() {
  const { colors } = useTheme()
  const dispatch = useDispatch()
  const notes = useSelector(getFilteredNotes)

  const handleSelectNote = useCallback(
    (noteId: string) => {
      dispatch(setSelectedNote(noteId as any))
      router.push(`/note/${noteId}` as any)
    },
    [dispatch],
  )

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
          headerTitle: 'Search',
          headerLargeTitle: true,
          headerTransparent: true,
          headerSearchBarOptions: {
            placeholder: 'Search all notes...',
            autoFocus: true,
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
        {notes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ color: colors.textSecondary, fontSize: 16, fontWeight: '600', opacity: 0.5 }}>
              Enter a search query to find notes.
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {notes.map((note: any, index: number) => (
              <NoteCard
                key={note.key}
                id={note.key}
                title={note.value?.title}
                date={format(
                  new Date(note.value?.updatedAt || note.value?.createdAt || 0),
                  'MM/dd/yy',
                )}
                summary={getPreviewText(note.value?.note)}
                folderName={note.value?.folderName}
                selected={false}
                isLast={index === notes.length - 1}
                onPress={() => handleSelectNote(note.key)}
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
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  listContainer: {
    paddingTop: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
    paddingHorizontal: 40,
  },
})
