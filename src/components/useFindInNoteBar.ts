import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { Keyboard, Platform, type TextInput } from 'react-native'

import { SEARCH_QUERY_MAX_LENGTH } from '@pear-notes/core/constant.js'

import type { TiptapEditorHandle } from '@/components/TiptapEditor'

export interface FindInNoteState {
  count: number
  active: number
}

export const EMPTY_FIND_STATE: FindInNoteState = { count: 0, active: -1 }

export interface FindInNoteBarProps {
  editorRef: RefObject<TiptapEditorHandle | null>
  findState: FindInNoteState
  onDone: () => void
  toolbarBottom?: number
}

const FOCUS_DELAYS_MS = Platform.OS === 'android' ? [350, 700] : [120]

export function useFindInNoteBar({
  editorRef,
  findState,
  onDone,
}: Omit<FindInNoteBarProps, 'toolbarBottom'>) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    const timers = FOCUS_DELAYS_MS.map((delay) =>
      setTimeout(() => {
        const input = inputRef.current
        if (!input || (input.isFocused() && Keyboard.isVisible())) return
        if (input.isFocused()) input.blur()
        input.focus()
      }, delay),
    )
    const editor = editorRef.current
    return () => {
      timers.forEach(clearTimeout)
      editor?.findClear()
    }
  }, [editorRef])

  const handleChangeQuery = useCallback(
    (text: string) => {
      const next = text.slice(0, SEARCH_QUERY_MAX_LENGTH)
      setQuery(next)
      editorRef.current?.findSetQuery(next.trim())
    },
    [editorRef],
  )

  const handleNext = useCallback(() => editorRef.current?.findMove(1), [editorRef])
  const handlePrevious = useCallback(() => editorRef.current?.findMove(-1), [editorRef])

  const handleDone = useCallback(() => {
    editorRef.current?.findClear()
    onDone()
  }, [editorRef, onDone])

  const hasQuery = query.trim().length > 0
  const hasMatches = hasQuery && findState.count > 0

  return {
    query,
    inputRef,
    hasQuery,
    hasMatches,
    current: findState.active + 1,
    total: findState.count,
    handleChangeQuery,
    handleNext,
    handlePrevious,
    handleDone,
  }
}
