import { getFilteredNotes, setSelectedNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { getSearchQuery, setSearchQuery } from '@pear-notes/core/store/slices/uiSlice.js'
import { format } from 'date-fns'
import { Stack } from 'expo-router'
import React, { useCallback } from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { NoteCard } from '@/components/NoteCard'
import { Text, Theme, View, useTheme, useThemedStyles } from '@/components/Themed'
import { Space, useCommonStyles } from '@/constants/commonStyles'
import { useNoteEditor } from '@/providers/NoteEditorContext'

export default function SearchScreen() {
  const theme = useTheme()
  const { colors, isDark } = theme
  const styles = useThemedStyles(createStyles)
  const common = useCommonStyles()
  const dispatch = useDispatch()
  const { openNote } = useNoteEditor()
  const notes = useSelector(getFilteredNotes)
  const searchQuery = useSelector(getSearchQuery) as string

  const handleSelectNote = useCallback(
    (noteId: string) => {
      dispatch(setSelectedNote(noteId as any))
      openNote(noteId)
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
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: 'Search',
          headerLargeTitle: true,
          headerTransparent: true,
          headerBlurEffect: isDark ? 'dark' : 'light',
          headerSearchBarOptions: {
            placeholder: 'Search all notes...',
            autoFocus: true,
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
        {notes.length === 0 ? (
          <View style={common.emptyContainer}>
            {searchQuery.trim().length > 0 ? (
              <>
                <Text style={common.emptyTitle}>No matches found</Text>
                <Text style={common.emptySubtitle}>Try a different search term</Text>
              </>
            ) : (
              <>
                <Text style={common.emptyTitle}>Search your notes</Text>
                <Text style={common.emptySubtitle}>
                  Type above to find notes across your library
                </Text>
              </>
            )}
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
                  'MMM d',
                )}
                summary={getPreviewText(note.value?.note)}
                folderName={note.value?.folderName}
                selected={false}
                isLast={index === notes.length - 1}
                animationIndex={index}
                onPress={() => handleSelectNote(note.key)}
              />
            ))}
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
      flexGrow: 1,
      paddingBottom: Space.scrollBottom,
      paddingHorizontal: Space.base,
    },
    listContainer: {
      paddingTop: Space.sm,
    },
  })
