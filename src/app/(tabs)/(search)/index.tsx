import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, type ListRenderItemInfo, StyleSheet } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { format } from 'date-fns'
import { Stack } from 'expo-router'

import { getFilteredNotes, setSelectedNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { getSearchQuery, setSearchQuery } from '@pear-notes/core/store/slices/uiSlice.js'

import { NoteCard } from '@/components/NoteCard'
import { createThemedStylesheet, Text, useTheme, View } from '@/components/Themed'
import { commonStyles, Space } from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { useNoteEditor } from '@/providers/NoteEditorContext'
import { getNoteMetadata } from '@/utils/noteMetadata'

const noteKeyExtractor = (note: any) => note.key

export default function SearchScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { colors, isDark } = theme
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const dispatch = useDispatch()
  const { openNote } = useNoteEditor()
  const notes = useSelector(getFilteredNotes)
  const searchQuery = useSelector(getSearchQuery) as string

  const handleSelectNote = useCallback(
    (noteId: string) => {
      dispatch(setSelectedNote(noteId as any))
      openNote(noteId)
    },
    [dispatch, openNote],
  )

  const renderNoteItem = useCallback(
    ({ item: note, index }: ListRenderItemInfo<any>) => {
      const formattedDate = format(
        new Date(note.value?.updatedAt || note.value?.createdAt || 0),
        'MMM d',
      )
      const metadata = getNoteMetadata(note.value)

      return (
        <NoteCard
          id={note.key}
          title={note.value?.title}
          date={formattedDate}
          summary={metadata.preview}
          attachment={metadata.attachment}
          rawImageUrl={metadata.imageUrl}
          folderName={note.value?.folderName}
          selected={false}
          isLast={index === notes.length - 1}
          animationIndex={index}
          locked={note.value?.locked === true}
          pinned={note.value?.pinned === true}
          onPress={handleSelectNote}
        />
      )
    },
    [notes.length, handleSelectNote],
  )

  const listEmpty = useMemo(
    () => (
      <View style={commonThemedStyles.emptyContainer}>
        {searchQuery.trim().length > 0 ? (
          <>
            <Text style={commonThemedStyles.emptyTitle}>{t('search.empty.noMatches')}</Text>
            <Text style={commonThemedStyles.emptySubtitle}>{t('search.empty.tryDifferent')}</Text>
          </>
        ) : (
          <>
            <Text style={commonThemedStyles.emptyTitle}>{t('search.empty.searchNotes')}</Text>
            <Text style={commonThemedStyles.emptySubtitle}>{t('search.empty.typeToFind')}</Text>
          </>
        )}
      </View>
    ),
    [
      searchQuery,
      t,
      commonThemedStyles.emptyContainer,
      commonThemedStyles.emptyTitle,
      commonThemedStyles.emptySubtitle,
    ],
  )

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: t('search.title'),
          headerLargeTitle: true,
          headerTransparent: true,
          headerBlurEffect: isDark ? 'dark' : 'light',
          headerSearchBarOptions: {
            placeholder: t('search.placeholder'),
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
      <FlatList
        data={notes}
        keyExtractor={noteKeyExtractor}
        renderItem={renderNoteItem}
        ListEmptyComponent={listEmpty}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      ...commonStyles.flex1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingTop: Space.sm,
      paddingBottom: Space.scrollBottom,
      paddingHorizontal: Space.base,
    },
  })
  return styles
})
