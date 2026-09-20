import React from 'react'
import { StyleSheet } from 'react-native'

import { NotesPane } from '@/components/notes/NotesPane'
import { createThemedStylesheet, View } from '@/components/Themed'
import { commonStyles, SIDEBAR_WIDTH } from '@/constants/commonStyles'

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

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      ...commonStyles.flex1,
      ...commonStyles.row,
      backgroundColor: theme.colors.background,
    },
    sidebar: {
      width: SIDEBAR_WIDTH,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: theme.colors.borderSecondary,
    },
    content: commonStyles.flex1,
  })
  return styles
})
