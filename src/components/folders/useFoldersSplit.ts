import { useCallback, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { ALL_NOTES_KEY } from '@pear-notes/core/constant.js'
import {
  getFolders,
  getSelectedFolder,
  setSelectedFolder,
} from '@pear-notes/core/store/slices/foldersSlice.js'

export function useFoldersSplit() {
  const dispatch = useDispatch()
  const folders = useSelector(getFolders)
  const persistedFolder = useSelector(getSelectedFolder) as string | null

  const folderIds = useMemo(
    () => new Set(folders.map((folder: any) => folder.id || folder.key)),
    [folders],
  )

  const activeFolderId =
    persistedFolder && folderIds.has(persistedFolder) ? persistedFolder : ALL_NOTES_KEY

  const selectFolder = useCallback(
    (folderId: string) => {
      dispatch(setSelectedFolder(folderId as any))
    },
    [dispatch],
  )

  const showAllNotes = useCallback(() => selectFolder(ALL_NOTES_KEY), [selectFolder])

  return { activeFolderId, selectFolder, showAllNotes }
}
