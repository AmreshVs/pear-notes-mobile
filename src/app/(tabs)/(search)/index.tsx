import { getFilteredNotes, setSelectedNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { getSearchQuery, setSearchQuery } from '@pear-notes/core/store/slices/uiSlice.js'
import { format } from 'date-fns'
import { Stack } from 'expo-router'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { NoteCard } from '@/components/NoteCard'
import { Text, View, createThemedStylesheet, useTheme } from '@/components/Themed'
import { Space, commonStyles } from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { useNoteEditor } from '@/providers/NoteEditorContext'

const PREVIEW_LIMIT = 100

export default function SearchScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { colors, isDark } = theme
  const styles = useStyles() as any
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

  const getPreviewText = useCallback(
    (html: string) => {
      if (!html) return t('folderView.noAdditionalText')
      return html
        .replace(/<[^>]*>?/gm, '')
        .substring(0, PREVIEW_LIMIT)
        .trim()
    },
    [t],
  )

  const renderNoteItem = useCallback(
    (note: any, index: number) => {
      const handlePress = () => handleSelectNote(note.key)
      const formattedDate = format(
        new Date(note.value?.updatedAt || note.value?.createdAt || 0),
        'MMM d',
      )
      const summary = getPreviewText(note.value?.note)

      return (
        <NoteCard
          key={note.key}
          id={note.key}
          title={note.value?.title}
          date={formattedDate}
          summary={summary}
          folderName={note.value?.folderName}
          selected={false}
          isLast={index === notes.length - 1}
          animationIndex={index}
          locked={note.value?.locked === true}
          onPress={handlePress}
        />
      )
    },
    [notes.length, getPreviewText, handleSelectNote],
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
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {notes.length === 0 ? (
          <View style={commonThemedStyles.emptyContainer}>
            {searchQuery.trim().length > 0 ? (
              <>
                <Text style={commonThemedStyles.emptyTitle}>{t('search.empty.noMatches')}</Text>
                <Text style={commonThemedStyles.emptySubtitle}>
                  {t('search.empty.tryDifferent')}
                </Text>
              </>
            ) : (
              <>
                <Text style={commonThemedStyles.emptyTitle}>{t('search.empty.searchNotes')}</Text>
                <Text style={commonThemedStyles.emptySubtitle}>{t('search.empty.typeToFind')}</Text>
              </>
            )}
          </View>
        ) : (
          <View style={styles.listContainer}>{notes.map(renderNoteItem)}</View>
        )}
      </ScrollView>
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
      paddingBottom: Space.scrollBottom,
      paddingHorizontal: Space.base,
    },
    listContainer: {
      paddingTop: Space.sm,
    },
  })
  return styles
})
