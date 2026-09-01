import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import {
  getEditorConflict,
  resolveEditorConflict,
} from '@pear-notes/core/store/slices/editorSlice.js'

type EditorConflict = { key?: string } | null

export function useNoteConflict(noteKey: string | null) {
  const dispatch = useDispatch()
  const conflict = useSelector(getEditorConflict) as EditorConflict
  const isVisible = !!noteKey && !!conflict?.key && conflict.key === noteKey

  const keepMine = useCallback(() => {
    dispatch(resolveEditorConflict('mine'))
  }, [dispatch])

  const useTheirs = useCallback(() => {
    dispatch(resolveEditorConflict('theirs'))
  }, [dispatch])

  return { isVisible, keepMine, useTheirs }
}
