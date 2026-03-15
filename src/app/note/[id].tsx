import { useLocalSearchParams } from 'expo-router'
import React, { useEffect, useMemo } from 'react'
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

  const containerStyle = useMemo(
    () => ({ flex: 1, backgroundColor: colors.background }),
    [colors.background],
  )

  return <View style={containerStyle} />
}
