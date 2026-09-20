import React from 'react'

import { FoldersPane } from '@/components/folders/FoldersPane'
import { FoldersSplitLayout } from '@/components/folders/FoldersSplitLayout'
import { useIsLargeScreen } from '@/hooks/useIsLargeScreen'

export default function FoldersScreen() {
  const isLargeScreen = useIsLargeScreen()

  if (isLargeScreen) return <FoldersSplitLayout />
  return <FoldersPane />
}
