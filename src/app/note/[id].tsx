import { useLocalSearchParams } from 'expo-router'
import React, { useEffect } from 'react'
import { View } from 'react-native'

import { useTheme } from '@/components/Themed'
import { useNoteEditor } from '@/providers/NoteEditorProvider'

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  const { openNote } = useNoteEditor()

  useEffect(() => {
    if (id) openNote(id)
  }, [id, openNote])

  return <View style={{ flex: 1, backgroundColor: colors.background }} />
}
