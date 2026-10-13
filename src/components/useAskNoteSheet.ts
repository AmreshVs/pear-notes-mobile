import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import * as Clipboard from 'expo-clipboard'

import { backendApi } from '@pear-notes/core/backend/api.js'
import {
  askNoteThreadFromTurns,
  clearAskNoteThread,
  loadAskNoteThread,
  saveAskNoteThread,
  savedAskNoteTurns,
} from '@pear-notes/core/store/services/askThreads.js'
import { LOCAL_AI_ERROR, LOCAL_AI_FEATURE } from '@pear-notes/core/store/services/localAiCatalog.js'
import { WORK_KIND } from '@pear-notes/core/store/services/localAiWorkProgress.js'
import {
  getLocalAiFeatureConfig,
  getMeaningSearchReady,
} from '@pear-notes/core/store/slices/localAiSlice.js'
import { getNotesData } from '@pear-notes/core/store/slices/notesSlice.js'
import { openAskVault } from '@pear-notes/core/store/slices/uiSlice.js'

import { useLocalAiWorkProgress } from '@/components/useLocalAiWorkProgress'
import { Durations } from '@/constants/commonStyles'
import { hapticLight, hapticSuccess, hapticWarning } from '@/lib/haptics'
import {
  applyEditsToText,
  ASK_KINDS,
  type AskApplyRequest,
  type AskError,
  type AskScope,
  type AskTurnView,
  canApplyAskTurn,
  createWorkingTurn,
  getAskHistory,
  getAskScopeInfo,
  hasDroppedTurns,
  replaceOnce,
  resolveAskTurn,
} from '@/lib/localAi/askNote'
import { askAboutNote, cancelLocalAiTask } from '@/lib/localAi/localAi'

const COPIED_RESET_MS = 2000

interface FeatureConfig {
  tier?: string
  language?: string
}

interface AskNoteSheetOptions {
  visible: boolean
  noteKey: string | null
  selectionText: string
  noteText: string
  onApplyEdits: (request: AskApplyRequest) => void
  onClose: () => void
}

function errorFromCause(cause: unknown): AskError {
  const code = (cause as { code?: string } | null)?.code
  if (code === LOCAL_AI_ERROR.NOT_ENOUGH_MEMORY) return 'notEnoughMemory'
  if (code === LOCAL_AI_ERROR.MODEL_UNSTABLE) return 'unstable'
  return 'failed'
}

const asEarlier = (saved: AskTurnView[]) =>
  saved.map((turn, index) => ({ ...turn, id: index - saved.length }))

export function useAskNoteSheet({
  visible,
  noteKey,
  selectionText,
  noteText,
  onApplyEdits,
  onClose,
}: AskNoteSheetOptions) {
  const dispatch = useDispatch()
  const summaryConfig = useSelector((state) =>
    getLocalAiFeatureConfig(state, LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS),
  ) as FeatureConfig | undefined
  const meaningReady = useSelector(getMeaningSearchReady) as boolean
  const notesData = useSelector(getNotesData) as Record<string, { locked?: boolean }> | null
  const notesRef = useRef(notesData)
  notesRef.current = notesData
  const { workView, beginWork, endWork } = useLocalAiWorkProgress()
  const [scope, setScope] = useState<AskScope>('note')
  const [texts, setTexts] = useState({ selection: '', note: '' })
  const [question, setQuestion] = useState('')
  const [turns, setTurns] = useState<AskTurnView[]>([])
  const [earlier, setEarlier] = useState<AskTurnView[]>([])
  const [loaded, setLoaded] = useState(false)
  const [threadKey, setThreadKey] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const turnIdRef = useRef(0)
  const runIdRef = useRef(0)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasSelection = texts.selection.trim().length > 0
  const busy = turns.some((turn) => turn.status === 'working')
  const sourceText = scope === 'selection' ? texts.selection : texts.note
  const scopeInfo = useMemo(() => getAskScopeInfo(scope, sourceText), [scope, sourceText])
  const droppedTurns = useMemo(() => hasDroppedTurns(turns, sourceText), [turns, sourceText])
  const emptySource = sourceText.trim().length === 0
  const canSend = question.trim().length > 0 && !busy && !emptySource
  const isLocked = useCallback((key: string) => notesRef.current?.[key]?.locked === true, [])

  useEffect(() => {
    if (!visible) return
    runIdRef.current += 1
    const initialSelection = selectionText.trim()
    setTexts({ selection: initialSelection, note: noteText })
    setScope(initialSelection ? 'selection' : 'note')
    setQuestion('')
    setTurns([])
    setEarlier([])
    setLoaded(false)
    setThreadKey(noteKey)
    endWork()
    let live = true
    loadAskNoteThread(backendApi, noteKey, isLocked)
      .then((saved: AskTurnView[]) => {
        if (live) setEarlier(asEarlier(saved))
      })
      .catch(() => {})
      .finally(() => {
        if (live) setLoaded(true)
      })
    return () => {
      live = false
    }
  }, [visible])

  useEffect(() => {
    if (!loaded || !threadKey || !turns.length || turns.some((turn) => turn.status === 'working')) {
      return
    }
    const thread = askNoteThreadFromTurns({ noteKey: threadKey, turns: [...earlier, ...turns] })
    if (thread) saveAskNoteThread(backendApi, thread, isLocked).catch(() => {})
  }, [earlier, isLocked, loaded, threadKey, turns])

  useEffect(
    () => () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    },
    [],
  )

  const updateTurn = useCallback((id: number, update: (turn: AskTurnView) => AskTurnView) => {
    setTurns((current) => current.map((turn) => (turn.id === id ? update(turn) : turn)))
  }, [])

  const handleSend = useCallback(async () => {
    const asked = question.trim()
    if (!asked || busy) return
    hapticLight()
    turnIdRef.current += 1
    const id = turnIdRef.current
    const runId = runIdRef.current
    const history = getAskHistory(turns)
    const text = sourceText
    setQuestion('')
    setTurns((current) => [...current, createWorkingTurn(id, asked, scope)])
    const onProgress = beginWork(WORK_KIND.NOTE_TASK, { input: text })
    try {
      const raw = await askAboutNote(text, history, asked, summaryConfig ?? {}, { onProgress })
      if (runId !== runIdRef.current) return
      hapticSuccess()
      updateTurn(id, (turn) => resolveAskTurn(turn, text, raw))
    } catch (cause) {
      if (runId !== runIdRef.current) return
      hapticWarning()
      updateTurn(id, (turn) => ({ ...turn, status: 'failed', error: errorFromCause(cause) }))
    } finally {
      if (runId === runIdRef.current) endWork()
    }
  }, [beginWork, busy, endWork, question, scope, sourceText, summaryConfig, turns, updateTurn])

  const handleToggleScope = useCallback(() => {
    if (busy || !hasSelection) return
    hapticLight()
    runIdRef.current += 1
    setScope((current) => (current === 'selection' ? 'note' : 'selection'))
    setEarlier((current) => asEarlier(savedAskNoteTurns([...current, ...turns]) as AskTurnView[]))
    setTurns([])
  }, [busy, hasSelection, turns])

  const handleClear = useCallback(() => {
    if (busy) return
    hapticLight()
    runIdRef.current += 1
    setEarlier([])
    setTurns([])
    if (threadKey) clearAskNoteThread(backendApi, threadKey).catch(() => {})
  }, [busy, threadKey])

  const handleApply = useCallback(
    (id: number) => {
      const turn = turns.find((item) => item.id === id)
      if (!turn || turn.applied || !canApplyAskTurn(turn, scope) || busy) return
      const editedText = turn.editedText ?? ''
      const isRewrite = turn.kind === ASK_KINDS.REWRITE
      hapticSuccess()
      onApplyEdits({
        scope,
        edits: turn.edits,
        replaceText: isRewrite ? editedText : null,
        lengthDelta: editedText.length - sourceText.length,
      })
      setTexts((current) => ({
        selection:
          scope === 'selection' ? editedText : applyEditsToText(current.selection, turn.edits),
        note:
          scope === 'note'
            ? editedText
            : isRewrite
              ? replaceOnce(current.note, current.selection, editedText)
              : applyEditsToText(current.note, turn.edits),
      }))
      updateTurn(id, (item) => ({ ...item, applied: true }))
    },
    [busy, onApplyEdits, scope, sourceText, turns, updateTurn],
  )

  const handleCopy = useCallback(
    async (id: number) => {
      const turn = [...earlier, ...turns].find((item) => item.id === id)
      if (!turn?.answer) return
      await Clipboard.setStringAsync(turn.answer)
      hapticSuccess()
      setCopiedId(id)
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
      copiedTimerRef.current = setTimeout(() => setCopiedId(null), COPIED_RESET_MS)
    },
    [earlier, turns],
  )

  const handleClose = useCallback(() => {
    runIdRef.current += 1
    if (busy) cancelLocalAiTask().catch(() => {})
    endWork()
    onClose()
  }, [busy, endWork, onClose])

  const handleSearchAllNotes = useCallback(
    (askedQuestion: string) => {
      handleClose()
      // Let this sheet's modal leave before the Ask your notes sheet presents.
      setTimeout(() => dispatch(openAskVault({ question: askedQuestion })), Durations.sheetClose)
    },
    [dispatch, handleClose],
  )

  return {
    scope,
    scopeInfo,
    hasSelection,
    question,
    setQuestion,
    turns,
    earlier,
    workView,
    busy,
    canSend,
    droppedTurns,
    emptySource,
    copiedId,
    meaningReady,
    handleSend,
    handleToggleScope,
    handleApply,
    handleCopy,
    handleClear,
    handleSearchAllNotes,
    handleClose,
  }
}
