import { useLocalSearchParams } from 'expo-router'
import React, { useEffect } from 'react'
import { View } from 'react-native'

import { useTheme } from '@/components/Themed'
import { useNoteEditor } from '@/providers/NoteEditorProvider'

/**
 * Deep-link fallback screen.
 * Normal in-app navigation uses `openNote()` directly (no router.push).
 * This screen exists so external deep links like pear-notes://note/abc still work.
 */
export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  const { openNote } = useNoteEditor()

  useEffect(() => {
    if (id) openNote(id)
  }, [id, openNote])

  // The actual editor is rendered by NoteEditorProvider via FullWindowOverlay.
  // This screen just shows a matching background while the overlay slides in.
  return <View style={{ flex: 1, backgroundColor: colors.background }} />
}
