import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import * as Clipboard from 'expo-clipboard'
import { router } from 'expo-router'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { ALL_NOTES_KEY } from '@pear-notes/core/constant.js'
import {
  askThreadFromTurns,
  deleteAskThread,
  loadVisibleAskThreads,
  saveAskThread,
} from '@pear-notes/core/store/services/askThreads.js'
import { getLocalAiAdapter } from '@pear-notes/core/store/services/localAiAdapter.js'
import { LOCAL_AI_ERROR, LOCAL_AI_FEATURE } from '@pear-notes/core/store/services/localAiCatalog.js'
import { isIndexable } from '@pear-notes/core/store/services/localAiIndex.js'
import { askYourVaultViaDesktop } from '@pear-notes/core/store/services/localAiOffload.js'
import {
  getVaultAskSuggestions,
  getVaultDraft,
  getVaultDraftTarget,
  getVaultReminderTask,
  getVaultScopeNotes,
  vaultDraftHtml,
  vaultDraftNote,
} from '@pear-notes/core/store/services/localAiVaultActions.js'
import {
  askYourVault,
  createVaultTurn,
  retrieveVaultSources,
  vaultAnswerNote,
} from '@pear-notes/core/store/services/localAiVaultAsk.js'
import { WORK_KIND } from '@pear-notes/core/store/services/localAiWorkProgress.js'
import { loadDoneIds } from '@pear-notes/core/store/services/upcomingTasks.js'
import { getFolders, getSelectedFolder } from '@pear-notes/core/store/slices/foldersSlice.js'
import {
  getLinkedDesktopTitle,
  getLocalAiFeatureConfig,
  getMeaningSearchReady,
  selectAskIndexNotice,
  selectCanUseLinkedDesktop,
  selectIsLocalAiFeatureReady,
} from '@pear-notes/core/store/slices/localAiSlice.js'
import {
  createNote,
  getNotesData,
  getSelectedNote,
} from '@pear-notes/core/store/slices/notesSlice.js'

import { useLocalAiWorkProgress } from '@/components/useLocalAiWorkProgress'
import { Durations } from '@/constants/commonStyles'
import { useRemindersSetting } from '@/hooks/useReminders'
import { hapticLight, hapticSuccess, hapticWarning } from '@/lib/haptics'
import { askVault, cancelLocalAiTask } from '@/lib/localAi/localAi'
import { appendHtmlToStoredNote } from '@/lib/noteUploadManager'
import { useNoteEditor } from '@/providers/NoteEditorContext'
import type { AskIndexNotice } from '@/utils/askIndexNotice'

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
  answeredOn?: string
}

export interface AskThreadView {
  id: string
  title: string
  turns: VaultTurnView[]
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

type NoteRecord = { title?: string; updatedAt?: number; folderKey?: string } | undefined
type FolderRecord = { id: string; name: string; isSystem?: boolean }
type UpcomingTask = { noteKey: string; date: string; time?: string; done?: boolean }

export interface VaultDraftView {
  title: string
  checklist: boolean
  items: { text: string; citations: { n: number; noteKey: string }[] }[]
}

export type DraftDone = { saved?: boolean; addedTo?: string }

const DAY_MS = 24 * 60 * 60 * 1000

function errorFromCause(cause: unknown): VaultError {
  const { code, message } = (cause ?? {}) as { code?: string; message?: unknown }
  if (code === LOCAL_AI_ERROR.NOT_ENOUGH_MEMORY) return 'notEnoughMemory'
  if (code === LOCAL_AI_ERROR.MODEL_UNSTABLE) return 'unstable'
  if (code === LOCAL_AI_ERROR.MODEL_MISSING) return 'notReady'
  if (/model busy/i.test(String(message ?? ''))) return 'busy'
  return 'failed'
}

async function substringKeys(query: string, folderKey: string): Promise<string[]> {
  const response = await backendApi.searchNotes({ query, folderKey })
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

export function getTurnDraft(turn: VaultTurnView): VaultDraftView | null {
  if (turn.status !== 'done' || !turn.result?.answer) return null
  return getVaultDraft({ question: turn.question, result: turn.result }) as VaultDraftView | null
}

/** Ask your notes: one thread per open of the sheet. */
export function useAskVaultSheet({ visible, initialQuestion, onClose }: AskVaultSheetOptions) {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const { openNote } = useNoteEditor()
  const summaryConfig = useSelector((state) =>
    getLocalAiFeatureConfig(state, LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS),
  ) as FeatureConfig | undefined
  const notesData = useSelector(getNotesData) as Record<string, NoteRecord>
  const meaningReady = useSelector(getMeaningSearchReady) as boolean
  const folders = useSelector(getFolders) as FolderRecord[]
  const selectedFolder = useSelector(getSelectedFolder) as string | null
  const openNoteKey = useSelector(getSelectedNote) as string | null
  const voiceReady = useSelector((state) =>
    selectIsLocalAiFeatureReady(state, LOCAL_AI_FEATURE.VOICE_TYPING),
  ) as boolean
  const [remindersOn, toggleReminders] = useRemindersSetting()
  const askReady = useSelector((state) =>
    selectIsLocalAiFeatureReady(state, LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS),
  ) as boolean
  const { workView, beginWork, endWork } = useLocalAiWorkProgress()
  const [question, setQuestion] = useState('')
  const [turns, setTurns] = useState<VaultTurnView[]>([])
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [savedId, setSavedId] = useState<number | null>(null)
  const [scope, setScope] = useState<string>(ALL_NOTES_KEY)
  const [draftDone, setDraftDone] = useState<Record<number, DraftDone>>({})
  const [upcoming, setUpcoming] = useState<{ tasks: UpcomingTask[]; doneIds: Set<string> }>({
    tasks: [],
    doneIds: new Set(),
  })
  const [dictating, setDictating] = useState(false)
  const dictationBaseRef = useRef('')
  const turnIdRef = useRef(0)
  const threadIdRef = useRef<string | null>(null)
  const [threads, setThreads] = useState<AskThreadView[]>([])
  const runIdRef = useRef(0)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const notesRef = useRef(notesData)
  notesRef.current = notesData

  const desktopReady = useSelector(selectCanUseLinkedDesktop) as boolean
  const desktopTitle = useSelector(getLinkedDesktopTitle) as string
  const localReady = meaningReady && askReady
  const localIndexNotice = useSelector(selectAskIndexNotice) as AskIndexNotice | null
  const indexNotice = desktopReady ? null : localIndexNotice
  const ready = localReady || desktopReady
  const busy = turns.some((turn) => turn.status === 'working')
  const canSend = ready && question.trim().length > 0 && !busy

  const folderById = useMemo(
    () =>
      new Map(
        (folders ?? [])
          .filter((folder) => !folder.isSystem)
          .map((folder) => [folder.id, folder] as const),
      ),
    [folders],
  )
  const currentFolder = (selectedFolder && folderById.get(selectedFolder)) || null
  const scopeKey = scope !== ALL_NOTES_KEY && !folderById.has(scope) ? ALL_NOTES_KEY : scope
  const scopeName = folderById.get(scopeKey)?.name ?? null
  const scopedCount = useMemo(
    () => getVaultScopeNotes(notesData, scopeKey).length,
    [notesData, scopeKey],
  )
  const suggestions = useMemo(
    () =>
      (
        getVaultAskSuggestions({ notes: notesData, folders, scope: scopeKey }) as {
          kind: string
          title?: string
          folder?: string
        }[]
      ).map((suggestion) => t(`localAi.askVault.suggest.${suggestion.kind}`, suggestion)),
    [folders, notesData, scopeKey, t],
  )

  useEffect(() => {
    if (!visible) return
    runIdRef.current += 1
    setQuestion(initialQuestion)
    setTurns([])
    threadIdRef.current = null
    setCopiedId(null)
    setSavedId(null)
    setDraftDone({})
    setScope(ALL_NOTES_KEY)
    setDictating(false)
    endWork()
    let live = true
    loadVisibleAskThreads(
      backendApi,
      (key: string) =>
        (notesRef.current?.[key] as { locked?: boolean } | undefined)?.locked === true,
    )
      .then((list: AskThreadView[]) => {
        if (live) setThreads(list)
      })
      .catch(() => {})
    Promise.all([
      backendApi.getUpcomingTasks() as Promise<UpcomingTask[] | null>,
      loadDoneIds().catch(() => new Set<string>()) as Promise<Set<string>>,
    ])
      .then(([tasks, doneIds]) => {
        if (live) setUpcoming({ tasks: tasks ?? [], doneIds })
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [visible])

  useEffect(
    () => () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    },
    [],
  )

  useEffect(() => {
    if (!threadIdRef.current || turns.some((turn) => turn.status === 'working')) return
    const thread = askThreadFromTurns({ id: threadIdRef.current, turns })
    if (thread) saveAskThread(backendApi, thread).catch(() => {})
  }, [turns])

  const openThread = useCallback(
    (thread: AskThreadView) => {
      if (busy) return
      threadIdRef.current = thread.id
      turnIdRef.current = thread.turns.length
      setTurns(thread.turns)
    },
    [busy],
  )

  const deleteThread = useCallback((id: string) => {
    setThreads((current) => current.filter((thread) => thread.id !== id))
    deleteAskThread(backendApi, id).catch(() => {})
  }, [])

  const updateTurn = useCallback((id: number, update: (turn: VaultTurnView) => VaultTurnView) => {
    setTurns((current) => current.map((turn) => (turn.id === id ? update(turn) : turn)))
  }, [])

  const handleSend = useCallback(
    async (text?: unknown) => {
      const asked = (typeof text === 'string' ? text : question).trim()
      if (!asked || busy || !ready) return
      hapticLight()
      if (!threadIdRef.current) threadIdRef.current = `ask-${Date.now()}`
      turnIdRef.current += 1
      const id = turnIdRef.current
      const runId = runIdRef.current
      const previous = turns
      setQuestion('')
      setTurns((current) => [...current, createVaultTurn(id, asked) as VaultTurnView])
      const onProgress = beginWork(WORK_KIND.NOTE_TASK, { input: asked })
      const noteOf = (key: string) => notesRef.current?.[key]
      const scoped = scopeKey !== ALL_NOTES_KEY
      const folderKey = scoped ? scopeKey : undefined
      try {
        const askHere = (localOnly = false) =>
          askYourVault({
            question: asked,
            turns: previous,
            retrieve: (query: string, history: { question: string }[]) =>
              retrieveVaultSources({
                api: backendApi,
                embed,
                question: query,
                turns: history,
                searchSubstring: (keyword: string) => substringKeys(keyword, scopeKey),
                isAllowed: (key: string) =>
                  isIndexable(noteOf(key)) && (!scoped || noteOf(key)?.folderKey === scopeKey),
                scoped,
                titleOf: (key: string) => noteOf(key)?.title ?? '',
                updatedAtOf: (key: string) => noteOf(key)?.updatedAt ?? 0,
              }),
            answer: (sources: unknown[], history: unknown[]) =>
              askVault(asked, sources as never, history as never, summaryConfig ?? {}, {
                onProgress,
                localOnly,
              }),
          })
        let viaDesktop = desktopReady
        const result = desktopReady
          ? await askYourVaultViaDesktop({
              question: asked,
              turns: previous,
              folderKey,
              onProgress,
            }).catch((cause: { started?: boolean; code?: string }) => {
              if (cause?.code !== 'cancelled' && localReady && !cause?.started) {
                viaDesktop = false
                return askHere(true)
              }
              throw cause
            })
          : await askHere()
        if (runId !== runIdRef.current) return
        hapticSuccess()
        updateTurn(id, (turn) => ({
          ...turn,
          status: 'done',
          result,
          sources: result.sources,
          answeredOn: viaDesktop && desktopTitle ? desktopTitle : undefined,
        }))
      } catch (cause) {
        if (runId !== runIdRef.current) return
        hapticWarning()
        updateTurn(id, (turn) => ({ ...turn, status: 'failed', error: errorFromCause(cause) }))
      } finally {
        if (runId === runIdRef.current) endWork()
      }
    },
    [
      beginWork,
      busy,
      desktopReady,
      desktopTitle,
      endWork,
      localReady,
      question,
      ready,
      scopeKey,
      summaryConfig,
      turns,
      updateTurn,
    ],
  )

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

  const draftTargetOf = useCallback(
    (draft: VaultDraftView) =>
      getVaultDraftTarget({ draft, openNoteKey, notes: notesData }) as string | null,
    [notesData, openNoteKey],
  )

  const handleSaveDraft = useCallback(
    (id: number) => {
      const turn = turns.find((item) => item.id === id)
      const draft = turn && getTurnDraft(turn)
      if (!draft || draftDone[id]) return
      hapticSuccess()
      dispatch(
        createNote(
          vaultDraftNote({
            draft,
            sources: turn.sources,
            sourcesLabel: t('localAi.askVault.sources'),
          }),
        ),
      )
      setDraftDone((current) => ({ ...current, [id]: { saved: true } }))
    },
    [dispatch, draftDone, t, turns],
  )

  const handleAddDraft = useCallback(
    async (id: number) => {
      const turn = turns.find((item) => item.id === id)
      const draft = turn && getTurnDraft(turn)
      const key = draft && draftTargetOf(draft)
      if (!draft || !key || draftDone[id]) return
      hapticSuccess()
      setDraftDone((current) => ({ ...current, [id]: { addedTo: key } }))
      const added = await appendHtmlToStoredNote(
        key,
        vaultDraftHtml(draft, { heading: true }),
      ).catch(() => false)
      if (added) return
      hapticWarning()
      setDraftDone(({ [id]: _dropped, ...rest }) => rest)
    },
    [draftDone, draftTargetOf, turns],
  )

  const formatDay = useCallback(
    (date: Date) =>
      date.toLocaleDateString(i18n.language, {
        month: 'short',
        day: 'numeric',
        ...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}),
      }),
    [i18n.language],
  )

  const reminderFor = useCallback(
    (turn: VaultTurnView) => {
      const { isCited, shown } = getShownSources(turn)
      if (!isCited) return null
      const task = getVaultReminderTask({
        citedKeys: shown.map((source) => source.noteKey),
        ...upcoming,
      }) as UpcomingTask | null
      if (!task) return null
      const [year, month, day] = task.date.split('-').map(Number)
      return formatDay(new Date(year, month - 1, day))
    },
    [formatDay, upcoming],
  )

  const sourceMeta = useCallback(
    (noteKey: string) => {
      const note = notesData?.[noteKey]
      const folder = note?.folderKey ? folderById.get(note.folderKey)?.name : undefined
      let edited = ''
      if (note?.updatedAt) {
        const date = new Date(note.updatedAt)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        edited =
          date >= today
            ? t('localAi.askVault.editedToday')
            : date >= new Date(today.getTime() - DAY_MS)
              ? t('localAi.askVault.editedYesterday')
              : t('localAi.askVault.editedOn', { date: formatDay(date) })
      }
      return [folder, edited].filter(Boolean).join(' · ')
    },
    [folderById, formatDay, notesData, t],
  )

  const toggleScope = useCallback(() => {
    if (!currentFolder || busy) return
    hapticLight()
    setScope((current) => (current === ALL_NOTES_KEY ? currentFolder.id : ALL_NOTES_KEY))
  }, [busy, currentFolder])

  const handleStartDictation = useCallback(() => {
    if (!voiceReady || busy) return
    hapticLight()
    dictationBaseRef.current = question.trim() ? `${question.trim()} ` : ''
    setDictating(true)
  }, [busy, question, voiceReady])

  const handleDictationText = useCallback(
    (text: string) => setQuestion(`${dictationBaseRef.current}${text}`),
    [],
  )

  const handleDictationCommit = useCallback((text: string) => {
    setQuestion(`${dictationBaseRef.current}${text}`.trim())
    setDictating(false)
  }, [])

  const handleDictationCancel = useCallback(() => {
    setQuestion(dictationBaseRef.current.trim())
    setDictating(false)
  }, [])

  const handleClose = useCallback(() => {
    runIdRef.current += 1
    if (busy) cancelLocalAiTask().catch(() => {})
    endWork()
    setDictating(false)
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
    desktopTitle,
    meaningReady,
    indexNotice,
    canSend,
    copiedId,
    savedId,
    notesData,
    draftDone,
    currentFolder,
    scopeKey,
    scopeName,
    scopedCount,
    suggestions,
    threads,
    openThread,
    deleteThread,
    remindersOn,
    voiceReady,
    dictating,
    toggleReminders,
    toggleScope,
    reminderFor,
    sourceMeta,
    draftTargetOf,
    handleSend,
    handleCopy,
    handleSave,
    handleSaveDraft,
    handleAddDraft,
    handleStartDictation,
    handleDictationText,
    handleDictationCommit,
    handleDictationCancel,
    handleClose,
    handleOpenNote,
    handleOpenSettings,
  }
}
