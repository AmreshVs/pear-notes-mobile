import React from 'react'
import { StyleSheet, View } from 'react-native'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { NotesPane } from '@/components/notes/NotesPane'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import { commonStyles, SIDEBAR_WIDTH } from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

import { FoldersPane } from './FoldersPane'
import { useFoldersSplit } from './useFoldersSplit'

export function FoldersSplitLayout() {
  const styles = useStyles()
  const { activeFolderId, selectFolder, showAllNotes } = useFoldersSplit()

  return (
    <View style={styles.container}>
      <View style={styles.sidebar}>
        <FoldersPane embedded selectedFolderId={activeFolderId} onSelectFolder={selectFolder} />
      </View>
      <View style={styles.content}>
        <NotesPane embedded folderId={activeFolderId} onRequestClose={showAllNotes} />
      </View>
    </View>
  )
}

const useSplitHooks = () => {
  const md3 = useMD3Theme()
  return { md3 }
}

const useStyles = createThemedStylesheetWithHooks(
  (theme, { md3 }: ReturnType<typeof useSplitHooks>) => {
    const c = md3.colors
    const styles = StyleSheet.create({
      container: {
        ...commonStyles.flex1,
        ...commonStyles.row,
        backgroundColor: c.background,
      },
      sidebar: {
        width: SIDEBAR_WIDTH,
        borderRightWidth: StyleSheet.hairlineWidth,
        borderRightColor: hexWithAlpha(c.onSurface, 0.12),
      },
      content: commonStyles.flex1,
    })
    return styles
  },
  useSplitHooks,
)
