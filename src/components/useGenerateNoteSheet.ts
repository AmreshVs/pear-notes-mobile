import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector, useStore } from 'react-redux'
import * as Clipboard from 'expo-clipboard'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { LOCAL_AI_FEATURE } from '@pear-notes/core/store/services/localAiCatalog.js'
import { cleanModelOutput } from '@pear-notes/core/store/services/localAiPrompts.js'
import { WORK_EVENT, WORK_KIND } from '@pear-notes/core/store/services/localAiWorkProgress.js'
import {
  buildGeneratedNote,
  buildGenerateInput,
} from '@pear-notes/core/store/services/noteGenerate.js'
import { getLocalAiFeatureConfig } from '@pear-notes/core/store/slices/localAiSlice.js'
import { createNote, getNotesData } from '@pear-notes/core/store/slices/notesSlice.js'

import { useLocalAiWorkProgress } from '@/components/useLocalAiWorkProgress'
import { hapticLight, hapticSuccess, hapticWarning } from '@/lib/haptics'
import { cancelLocalAiTask, type LocalAiWorkEvent, runNoteTask } from '@/lib/localAi/localAi'

const COPIED_RESET_MS = 2000

type GenerateStatus = 'working' | 'done' | 'failed'

export interface GenerateLine {
  heading: boolean
  text: string
}

interface GenerateNoteSheetOptions {
  visible: boolean
  task: string | null
  noteKeys: string[]
  onClose: () => void
}

interface FeatureConfig {
  tier?: string
  language?: string
}

interface StoredNote {
  title?: string
  note?: string
  locked?: boolean
  bodyOmitted?: boolean
}

async function loadNote(key: string, notesData: Record<string, StoredNote> | undefined) {
  const stored = notesData?.[key]
  if (stored && !stored.bodyOmitted && typeof stored.note === 'string') return stored
  const response = (await backendApi.getSingleNote({ key })) as { data?: StoredNote } | undefined
  return response?.data ?? stored ?? null
}

function toLines(output: string): GenerateLine[] {
  return (cleanModelOutput(output) as string)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      /^#{1,3}\s+/.test(line)
        ? { heading: true, text: line.replace(/^#{1,3}\s+/, '') }
        : {
            heading: false,
            text: line.replace(/\*\*/g, '').replace(/^[-*•]\s*(?=\S)/, '• '),
          },
    )
}

export function useGenerateNoteSheet({
  visible,
  task,
  noteKeys,
  onClose,
}: GenerateNoteSheetOptions) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const store = useStore()
  const featureConfig = useSelector((state) =>
    getLocalAiFeatureConfig(state, LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS),
  ) as FeatureConfig | undefined
  const { workView, beginWork, endWork } = useLocalAiWorkProgress()
  const [output, setOutput] = useState('')
  const [status, setStatus] = useState<GenerateStatus>('working')
  const [sources, setSources] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const runIdRef = useRef(0)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tRef = useRef(t)
  tRef.current = t
  const configRef = useRef(featureConfig)
  configRef.current = featureConfig

  useEffect(() => {
    if (!visible || !task) return
    runIdRef.current += 1
    const runId = runIdRef.current
    setOutput('')
    setStatus('working')
    setSources([])
    setCopied(false)
    setSaved(false)
    const untitled = tRef.current('noteCard.untitled') as string
    ;(async () => {
      const notesData = getNotesData(store.getState()) as Record<string, StoredNote> | undefined
      const notes = (await Promise.all(noteKeys.map((key) => loadNote(key, notesData)))).filter(
        (note): note is StoredNote => !!note && !note.locked,
      )
      if (runId !== runIdRef.current) return
      setSources(notes.map((note) => note.title?.trim() || untitled))
      const input = buildGenerateInput(notes, { untitled }) as string
      const report = beginWork(WORK_KIND.NOTE_TASK, { input })
      const text = await runNoteTask(task, input, configRef.current ?? {}, {
        onProgress: (event: LocalAiWorkEvent) => {
          report(event)
          if (runId === runIdRef.current && event.type === WORK_EVENT.TEXT) {
            setOutput(event.text ?? '')
          }
        },
      })
      if (runId !== runIdRef.current) return
      setOutput(text)
      endWork()
      if (text.trim()) {
        hapticSuccess()
        setStatus('done')
      } else {
        hapticWarning()
        setStatus('failed')
      }
    })().catch(() => {
      if (runId !== runIdRef.current) return
      endWork()
      hapticWarning()
      setStatus('failed')
    })
    return () => {
      runIdRef.current += 1
    }
  }, [beginWork, endWork, noteKeys, store, task, visible])

  useEffect(
    () => () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    },
    [],
  )

  const title = task
    ? (t(`generate.titles.${task}`, { title: sources[0] ?? '', count: noteKeys.length }) as string)
    : ''
  const lines = useMemo(() => toLines(output), [output])

  const handleCopy = useCallback(async () => {
    if (status !== 'done') return
    await Clipboard.setStringAsync(output)
    hapticSuccess()
    setCopied(true)
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    copiedTimerRef.current = setTimeout(() => setCopied(false), COPIED_RESET_MS)
  }, [output, status])

  const handleSave = useCallback(() => {
    if (status !== 'done' || saved || !task) return
    hapticLight()
    dispatch(
      createNote(
        buildGeneratedNote({
          task,
          output,
          sources,
          title,
          sourcesLabel: t('generate.sources'),
        }),
      ),
    )
    setSaved(true)
  }, [dispatch, output, saved, sources, status, t, task, title])

  const handleClose = useCallback(() => {
    runIdRef.current += 1
    if (status === 'working') cancelLocalAiTask().catch(() => {})
    endWork()
    onClose()
  }, [endWork, onClose, status])

  return { title, status, lines, workView, copied, saved, handleCopy, handleSave, handleClose }
}
