import React, { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useLocalSearchParams } from 'expo-router'

import { setSelectedFolder } from '@pear-notes/core/store/slices/foldersSlice.js'

import { FoldersSplitLayout } from '@/components/folders/FoldersSplitLayout'
import { NotesPane } from '@/components/notes/NotesPane'
import { useIsLargeScreen } from '@/hooks/useIsLargeScreen'

export default function FolderNotesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const isLargeScreen = useIsLargeScreen()
  const dispatch = useDispatch()

  useEffect(() => {
    if (!isLargeScreen || !id) return
    dispatch(setSelectedFolder(id as any))
  }, [isLargeScreen, id, dispatch])

  if (isLargeScreen) return <FoldersSplitLayout />
  return <NotesPane folderId={id} />
}
