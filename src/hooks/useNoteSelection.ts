import { useCallback, useMemo, useState } from 'react'

type NoteSelectionState = {
  folder: string | null
  active: boolean
  keys: string[]
}

const EMPTY_SELECTION: NoteSelectionState = { folder: null, active: false, keys: [] }
const NO_KEYS: string[] = []

export function useNoteSelection(folderId: string, orderedKeys: string[]) {
  const [selection, setSelection] = useState<NoteSelectionState>(EMPTY_SELECTION)

  const isSelecting = selection.active && selection.folder === folderId

  const selectedKeys = useMemo(() => {
    if (!isSelecting) return NO_KEYS
    const live = new Set(orderedKeys)
    return selection.keys.filter((key) => live.has(key))
  }, [isSelecting, selection.keys, orderedKeys])

  const selectedKeySet = useMemo(() => new Set(selectedKeys), [selectedKeys])

  const toggleSelect = useCallback(
    (key: string) => {
      setSelection((prev) => {
        const keys = prev.active && prev.folder === folderId ? prev.keys : []
        return {
          folder: folderId,
          active: true,
          keys: keys.includes(key) ? keys.filter((current) => current !== key) : [...keys, key],
        }
      })
    },
    [folderId],
  )

  const startSelecting = useCallback(
    (initialKey?: string) => {
      setSelection({
        folder: folderId,
        active: true,
        keys: initialKey ? [initialKey] : [],
      })
    },
    [folderId],
  )

  const selectAll = useCallback(() => {
    setSelection({ folder: folderId, active: true, keys: orderedKeys })
  }, [folderId, orderedKeys])

  const clearSelection = useCallback(() => {
    setSelection((prev) => ({ ...prev, keys: [] }))
  }, [])

  const exitSelection = useCallback(() => {
    setSelection(EMPTY_SELECTION)
  }, [])

  const isAllSelected = orderedKeys.length > 0 && selectedKeys.length === orderedKeys.length

  return {
    isSelecting,
    selectedKeys,
    selectedKeySet,
    selectedCount: selectedKeys.length,
    isAllSelected,
    toggleSelect,
    startSelecting,
    selectAll,
    clearSelection,
    exitSelection,
  }
}
