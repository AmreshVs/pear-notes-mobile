import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import * as Clipboard from 'expo-clipboard'
import { router } from 'expo-router'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { ALL_NOTES_KEY } from '@pear-notes/core/constant.js'
import { getLocalAiAdapter } from '@pear-notes/core/store/services/localAiAdapter.js'
import { LOCAL_AI_ERROR, LOCAL_AI_FEATURE } from '@pear-notes/core/store/services/localAiCatalog.js'
import { isIndexable } from '@pear-notes/core/store/services/localAiIndex.js'
import {
  askYourVault,
  createVaultTurn,
  retrieveVaultSources,
  vaultAnswerNote,
} from '@pear-notes/core/store/services/localAiVaultAsk.js'
import { WORK_KIND } from '@pear-notes/core/store/services/localAiWorkProgress.js'
import {
  getLocalAiFeatureConfig,
  getMeaningSearchReady,
  selectIsLocalAiFeatureReady,
} from '@pear-notes/core/store/slices/localAiSlice.js'
import { createNote, getNotesData } from '@pear-notes/core/store/slices/notesSlice.js'

import { useLocalAiWorkProgress } from '@/components/useLocalAiWorkProgress'
import { Durations } from '@/constants/commonStyles'
import { hapticLight, hapticSuccess, hapticWarning } from '@/lib/haptics'
import { askVault, cancelLocalAiTask } from '@/lib/localAi/localAi'
import { useNoteEditor } from '@/providers/NoteEditorContext'

const COPIED_RESET_MS = 2000

export type VaultError = 'failed' | 'notEnoughMemory' | 'unstable' | 'notReady' | 'busy'

export interface VaultSourceView {
  n: number
  noteKey: string
  title: string
  text: string
}

export interface VaultResultView {
  kind: string
  answer: string
  citations: { n: number; noteKey: string }[]
  verified: boolean
  sources: VaultSourceView[]
}

export interface VaultTurnView {
  id: number
  question: string
  status: 'working' | 'done' | 'failed'
  result: VaultResultView | null
  sources: VaultSourceView[]
  error?: VaultError
}

interface FeatureConfig {
  tier?: string
  language?: string
}

interface AskVaultSheetOptions {
  visible: boolean
  initialQuestion: string
  onClose: () => void
}

type NoteRecord = { title?: string; updatedAt?: number } | undefined

function errorFromCause(cause: unknown): VaultError {
  const { code, message } = (cause ?? {}) as { code?: string; message?: unknown }
  if (code === LOCAL_AI_ERROR.NOT_ENOUGH_MEMORY) return 'notEnoughMemory'
  if (code === LOCAL_AI_ERROR.MODEL_UNSTABLE) return 'unstable'
  if (code === LOCAL_AI_ERROR.MODEL_MISSING) return 'notReady'
  if (/model busy/i.test(String(message ?? ''))) return 'busy'
  return 'failed'
}

async function substringKeys(query: string): Promise<string[]> {
  const response = await backendApi.searchNotes({ query, folderKey: ALL_NOTES_KEY })
  return (response?.results ?? []).map((result: { key: string }) => result.key)
}

function embed(texts: string[]) {
  const embedTexts = getLocalAiAdapter()?.embedTexts
  if (!embedTexts) throw new Error('embedTexts unavailable')
  return embedTexts(texts)
}

const CITATION = /\[(\d{1,2})\]/g
const RELATED_SOURCES_SHOWN = 3

export type AnswerPart = { text: string } | { n: number; source: VaultSourceView; text: string }

/** Splits an answer into plain text and the [n] markers that point at a known source. */
export function splitAnswerCitations(answer: string, sources: VaultSourceView[]): AnswerPart[] {
  const byNumber = new Map(sources.map((source) => [source.n, source]))
  const parts: AnswerPart[] = []
  let plain = ''
  let last = 0
  for (const match of answer.matchAll(CITATION)) {
    const index = match.index ?? 0
    const source = byNumber.get(Number(match[1]))
    plain += answer.slice(last, index)
    last = index + match[0].length
    if (!source) {
      plain += match[0]
      continue
    }
    if (plain) parts.push({ text: plain })
    plain = ''
    parts.push({ n: source.n, source, text: match[1] })
  }
  plain += answer.slice(last)
  if (plain) parts.push({ text: plain })
  return parts
}

/** The cited sources, or the closest few when the answer cites none. */
export function getShownSources(turn: VaultTurnView) {
  const cited = new Set((turn.result?.citations ?? []).map((citation) => citation.n))
  const shown = cited.size
    ? turn.sources.filter((source) => cited.has(source.n))
    : turn.sources.slice(0, RELATED_SOURCES_SHOWN)
  return { isCited: cited.size > 0, shown }
}

/** Ask your notes: one thread per open of the sheet. */
export function useAskVaultSheet({ visible, initialQuestion, onClose }: AskVaultSheetOptions) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { openNote } = useNoteEditor()
  const summaryConfig = useSelector((state) =>
    getLocalAiFeatureConfig(state, LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS),
  ) as FeatureConfig | undefined
  const notesData = useSelector(getNotesData) as Record<string, NoteRecord>
  const meaningReady = useSelector(getMeaningSearchReady) as boolean
  const askReady = useSelector((state) =>
    selectIsLocalAiFeatureReady(state, LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS),
  ) as boolean
  const { workView, beginWork, endWork } = useLocalAiWorkProgress()
  const [question, setQuestion] = useState('')
  const [turns, setTurns] = useState<VaultTurnView[]>([])
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [savedId, setSavedId] = useState<number | null>(null)
  const turnIdRef = useRef(0)
  const runIdRef = useRef(0)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const notesRef = useRef(notesData)
  notesRef.current = notesData

  const ready = meaningReady && askReady
  const busy = turns.some((turn) => turn.status === 'working')
  const canSend = ready && question.trim().length > 0 && !busy

  useEffect(() => {
    if (!visible) return
    runIdRef.current += 1
    setQuestion(initialQuestion)
    setTurns([])
    setCopiedId(null)
    setSavedId(null)
    endWork()
  }, [visible])

  useEffect(
    () => () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    },
    [],
  )

  const updateTurn = useCallback((id: number, update: (turn: VaultTurnView) => VaultTurnView) => {
    setTurns((current) => current.map((turn) => (turn.id === id ? update(turn) : turn)))
  }, [])

  const handleSend = useCallback(async () => {
    const asked = question.trim()
    if (!asked || busy || !ready) return
    hapticLight()
    turnIdRef.current += 1
    const id = turnIdRef.current
    const runId = runIdRef.current
    const previous = turns
    setQuestion('')
    setTurns((current) => [...current, createVaultTurn(id, asked) as VaultTurnView])
    const onProgress = beginWork(WORK_KIND.NOTE_TASK, { input: asked })
    const noteOf = (key: string) => notesRef.current?.[key]
    try {
      const result = await askYourVault({
        question: asked,
        turns: previous,
        retrieve: (query: string, history: { question: string }[]) =>
          retrieveVaultSources({
            api: backendApi,
            embed,
            question: query,
            turns: history,
            searchSubstring: substringKeys,
            isAllowed: (key: string) => isIndexable(noteOf(key)),
            titleOf: (key: string) => noteOf(key)?.title ?? '',
            updatedAtOf: (key: string) => noteOf(key)?.updatedAt ?? 0,
          }),
        answer: (sources: unknown[], history: unknown[]) =>
          askVault(asked, sources as never, history as never, summaryConfig ?? {}, { onProgress }),
      })
      if (runId !== runIdRef.current) return
      hapticSuccess()
      updateTurn(id, (turn) => ({ ...turn, status: 'done', result, sources: result.sources }))
    } catch (cause) {
      if (runId !== runIdRef.current) return
      hapticWarning()
      updateTurn(id, (turn) => ({ ...turn, status: 'failed', error: errorFromCause(cause) }))
    } finally {
      if (runId === runIdRef.current) endWork()
    }
  }, [beginWork, busy, endWork, question, ready, summaryConfig, turns, updateTurn])

  const handleCopy = useCallback(
    async (id: number) => {
      const turn = turns.find((item) => item.id === id)
      if (!turn?.result?.answer) return
      await Clipboard.setStringAsync(turn.result.answer)
      hapticSuccess()
      setCopiedId(id)
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
      copiedTimerRef.current = setTimeout(() => setCopiedId(null), COPIED_RESET_MS)
    },
    [turns],
  )

  const handleSave = useCallback(
    (id: number) => {
      const turn = turns.find((item) => item.id === id)
      if (!turn?.result?.answer || savedId === id) return
      hapticSuccess()
      const note = vaultAnswerNote({
        question: turn.question,
        result: turn.result,
        sourcesLabel: t('localAi.askVault.sources'),
      })
      dispatch(createNote(note))
      setSavedId(id)
    },
    [dispatch, savedId, t, turns],
  )

  const handleClose = useCallback(() => {
    runIdRef.current += 1
    if (busy) cancelLocalAiTask().catch(() => {})
    endWork()
    onClose()
  }, [busy, endWork, onClose])

  const handleOpenNote = useCallback(
    (noteKey: string) => {
      handleClose()
      openNote(noteKey)
    },
    [handleClose, openNote],
  )

  const handleOpenSettings = useCallback(() => {
    handleClose()
    // The settings screen is a native modal; wait for the sheet's own modal to leave first.
    setTimeout(() => router.push('/settings/on-device-ai' as never), Durations.sheetClose)
  }, [handleClose])

  return {
    question,
    setQuestion,
    turns,
    workView,
    busy,
    ready,
    meaningReady,
    canSend,
    copiedId,
    savedId,
    handleSend,
    handleCopy,
    handleSave,
    handleClose,
    handleOpenNote,
    handleOpenSettings,
  }
}
