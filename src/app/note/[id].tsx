import { useLocalSearchParams } from 'expo-router'
import { useEffect } from 'react'
import { StyleSheet } from 'react-native'

import { createThemedStylesheet, View } from '@/components/Themed'
import { useNoteEditor } from '@/providers/NoteEditorContext'

export default function NoteScreen() {
  const { id, isNew } = useLocalSearchParams<{ id: string; isNew?: string }>()
  const styles = useStyles()
  const { openNote } = useNoteEditor()

  useEffect(() => {
    if (id) openNote(id, { focusTitle: isNew === '1' })
  }, [id, isNew, openNote])

  return <View style={styles.container} />
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
  })
  return styles
})
