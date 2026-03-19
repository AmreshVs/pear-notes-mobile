import { useLocalSearchParams } from 'expo-router'
import React, { useEffect } from 'react'
import { StyleSheet } from 'react-native'

import { Theme, useThemedStyles, View } from '@/components/Themed'
import { useNoteEditor } from '@/providers/NoteEditorContext'

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const styles = useThemedStyles(createStyles)
  const { openNote } = useNoteEditor()

  useEffect(() => {
    if (id) openNote(id)
  }, [id, openNote])

  return <View style={styles.container} />
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
  })
