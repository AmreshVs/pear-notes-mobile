import { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { SUGGESTION_KIND } from '@pear-notes/core/store/services/noteSuggestions.js'
import { getFoldersData } from '@pear-notes/core/store/slices/foldersSlice.js'
import { noteSuggestionAccepted } from '@pear-notes/core/store/slices/localAiSlice.js'
import { applyFolderMoves } from '@pear-notes/core/store/slices/notesSlice.js'

import type { TidyMove } from '@/hooks/useTidyMoves'
import { hapticLight, hapticSuccess } from '@/lib/haptics'

type FoldersData = Record<string, { title?: string } | undefined>

export function useTidyUpSheet({
  visible,
  moves,
  onClose,
}: {
  visible: boolean
  moves: TidyMove[]
  onClose: () => void
}) {
  const dispatch = useDispatch()
  const folders = useSelector(getFoldersData) as FoldersData
  const [skipped, setSkipped] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    if (visible) setSkipped(new Set())
  }, [visible])

  const handleToggle = useCallback((key: string) => {
    hapticLight()
    setSkipped((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const chosen = moves.filter((move) => !skipped.has(move.key))

  const handleApply = useCallback(() => {
    if (chosen.length === 0) return
    hapticSuccess()
    dispatch(applyFolderMoves({ moves: chosen } as any))
    dispatch(
      noteSuggestionAccepted({
        kind: SUGGESTION_KIND.FOLDER,
        folderKeys: chosen.map((move) => move.to),
      } as any),
    )
    onClose()
  }, [chosen, dispatch, onClose])

  return {
    moves,
    folders,
    skipped,
    chosenCount: chosen.length,
    handleToggle,
    handleApply,
  }
}
