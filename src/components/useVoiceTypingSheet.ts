import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Linking } from 'react-native'
import { Easing, runOnJS, useSharedValue, withTiming } from 'react-native-reanimated'
import { useDispatch, useSelector, useStore } from 'react-redux'
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  useAudioRecorder,
} from 'expo-audio'
import * as Clipboard from 'expo-clipboard'
import { File } from 'expo-file-system'
import * as Localization from 'expo-localization'

import {
  LOCAL_AI_ERROR,
  LOCAL_AI_FEATURE,
  LOCAL_AI_MODEL_STATUS,
  LOCAL_AI_NOTICE,
} from '@pear-notes/core/store/services/localAiCatalog.js'
import {
  detectTextLanguage,
  getTranslationModelNames,
  normalizeLanguageCode,
  pickTranslationTarget,
  TRANSLATION_ALL_LANGUAGES,
} from '@pear-notes/core/store/services/localAiLanguage.js'
import {
  isRewriteTask,
  NOTE_TASK,
  NOTE_TASK_MIN_CHARS,
  parseKeyPointsOutput,
  parseRewriteOutput,
  parseSummaryOutput,
  parseTitleOutput,
  REWRITE_MAX_CHARS,
} from '@pear-notes/core/store/services/localAiPrompts.js'
import { TRANSLATION_SOURCE_LANGUAGE } from '@pear-notes/core/store/services/localAiTranslationModels.js'
import { WORK_KIND } from '@pear-notes/core/store/services/localAiWorkProgress.js'
import {
  clearLocalAiNotice,
  downloadLocalAiModelNow,
  downloadLocalAiModels,
  getLocalAiFeatureConfig,
  getLocalAiNotice,
  getLocalAiTranslationTarget,
  selectLocalAiModelsStatus,
  setLocalAiTranslationTarget,
} from '@pear-notes/core/store/slices/localAiSlice.js'

import { RECORDING_BARS, sampleAmp } from '@/components/useAudioRecorderModal'
import { useLocalAiWorkProgress } from '@/components/useLocalAiWorkProgress'
import { MOCK_LOCAL_AI } from '@/constants/constants'
import { hapticMedium, hapticSelection, hapticSuccess, hapticWarning } from '@/lib/haptics'
import {
  cancelLocalAiTask,
  describeImage,
  extractTextFromImage,
  extractTextFromPdf,
  type LiveTranscription,
  resetLocalAiModelHealth,
  runNoteTask,
  startLiveTranscription,
  summarizeTranscript,
  transcribeAudioFile,
  translateParagraphs,
} from '@/lib/localAi/localAi'
import { getRewriteDiff } from '@/lib/localAi/rewriteChanges'
import { SHORTER_TARGET_RATIO } from '@/lib/localAi/workProgress'

import ExpoLocalAi from '../../modules/expo-local-ai'

export type NoteTaskMode = 'summarizeNote' | 'suggestTitle' | 'keyPoints'
export type RewriteMode =
  | 'fixGrammar'
  | 'rewrite'
  | 'makeShorter'
  | 'makeProfessional'
  | 'makeFriendly'
export type VoiceTypingMode =
  | 'dictate'
  | 'transcribe'
  | 'extract'
  | 'describe'
  | 'translate'
  | NoteTaskMode
  | RewriteMode
export type AiScope = 'note' | 'selection'
export type ApplyAction = 'insert' | 'replace'

export const REWRITE_MODES: RewriteMode[] = [
  'fixGrammar',
  'rewrite',
  'makeShorter',
  'makeProfessional',
  'makeFriendly',
]

export interface InsertMeta {
  language: string | null
  bullets: string[]
  action: ApplyAction
}
export type VoiceTypingPhase =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'preview'
  | 'error'
  | 'choose'
  | 'downloading'
  | 'waiting'
  | 'preparing'
export type VoiceTypingError =
  | 'micDenied'
  | 'failed'
  | 'empty'
  | 'noSpace'
  | 'downloadFailed'
  | 'tooLong'
  | 'dictationFailed'
  | 'notEnoughMemory'
  | 'unstable'
export type SummaryPhase = 'idle' | 'working' | 'failed'

export interface TranscriptSummary {
  summary: string
  actionItems: string[]
}

export interface DownloadProgress {
  percent: number
  missingBytes: number
}

interface ModelsStatus extends DownloadProgress {
  status: string
}

interface LocalAiNotice {
  type: string
  names?: string[]
  requiredBytes?: number
}

const COPIED_RESET_MS = 2000
const REPORT_EMAIL = 'vsamreshpro@gmail.com'
const TIMER_TICK_MS = 50
const BAR_SAMPLE_MS = 90
const RESTING_BAR = 0.16
const EMPTY_PARAGRAPHS: string[] = []
const EMPTY_PROGRESS: DownloadProgress = { percent: 0, missingBytes: 0 }
const WAITING_STATUSES: string[] = [
  LOCAL_AI_MODEL_STATUS.WAITING_NETWORK,
  LOCAL_AI_MODEL_STATUS.PAUSED,
]

export const TRANSLATE_LANGUAGES = TRANSLATION_ALL_LANGUAGES as string[]

const NOTE_TASK_BY_MODE: Record<NoteTaskMode | RewriteMode, string> = {
  summarizeNote: NOTE_TASK.NOTE_SUMMARY,
  suggestTitle: NOTE_TASK.TITLE,
  keyPoints: NOTE_TASK.KEY_POINTS,
  fixGrammar: NOTE_TASK.FIX_GRAMMAR,
  rewrite: NOTE_TASK.REWRITE,
  makeShorter: NOTE_TASK.MAKE_SHORTER,
  makeProfessional: NOTE_TASK.MAKE_PROFESSIONAL,
  makeFriendly: NOTE_TASK.MAKE_FRIENDLY,
}

export const isNoteTaskMode = (mode: VoiceTypingMode): mode is NoteTaskMode | RewriteMode =>
  mode in NOTE_TASK_BY_MODE

export const isRewriteMode = (mode: VoiceTypingMode): mode is RewriteMode =>
  (REWRITE_MODES as string[]).includes(mode)

const FEATURE_BY_MODE: Record<VoiceTypingMode, string> = {
  dictate: LOCAL_AI_FEATURE.VOICE_TYPING,
  transcribe: LOCAL_AI_FEATURE.TRANSCRIBE_RECORDINGS,
  extract: LOCAL_AI_FEATURE.EXTRACT_TEXT,
  describe: LOCAL_AI_FEATURE.DESCRIBE_IMAGES,
  translate: LOCAL_AI_FEATURE.TRANSLATE_NOTES,
  summarizeNote: LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS,
  suggestTitle: LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS,
  keyPoints: LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS,
  fixGrammar: LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS,
  rewrite: LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS,
  makeShorter: LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS,
  makeProfessional: LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS,
  makeFriendly: LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS,
}

interface VoiceTypingSheetOptions {
  visible: boolean
  mode: VoiceTypingMode
  scope?: AiScope
  sourceUri: string | null
  sourceParagraphs?: string[] | null
  summaryAvailable?: boolean
  onInsert: (text: string, summary: TranscriptSummary | null, meta: InsertMeta) => void
  onAttachAudio?: (uri: string, durationMs: number) => void
  onClose: () => void
}

interface SavedAudio {
  uri: string
  durationMs: number
}

interface FeatureConfig {
  tier?: string
  language?: string
}

function errorFromCause(cause: unknown): VoiceTypingError | null {
  const code = (cause as { code?: string } | null)?.code
  if (code === LOCAL_AI_ERROR.NOT_ENOUGH_MEMORY) return 'notEnoughMemory'
  if (code === LOCAL_AI_ERROR.MODEL_UNSTABLE) return 'unstable'
  return null
}

function deleteLocalFile(uri: string | null) {
  if (!uri) return
  try {
    const file = new File(uri)
    if (file.exists) file.delete()
  } catch {}
}

const supportsLiveDictation = () =>
  MOCK_LOCAL_AI || typeof ExpoLocalAi?.startPcmStream === 'function'

export function useVoiceTypingSheet({
  visible,
  mode,
  sourceUri,
  scope = 'note',
  sourceParagraphs = null,
  summaryAvailable = false,
  onInsert,
  onAttachAudio,
  onClose,
}: VoiceTypingSheetOptions) {
  const feature = FEATURE_BY_MODE[mode]
  const usesSource = mode !== 'dictate'
  const paragraphs = sourceParagraphs ?? EMPTY_PARAGRAPHS
  const dispatch = useDispatch()
  const store = useStore()
  const featureConfig = useSelector((state) => getLocalAiFeatureConfig(state, feature)) as
    | FeatureConfig
    | undefined
  const summaryConfig = useSelector((state) =>
    getLocalAiFeatureConfig(state, LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS),
  ) as FeatureConfig | undefined
  const lastTarget = useSelector(getLocalAiTranslationTarget) as string | null
  const deviceLanguage = useMemo(
    () => normalizeLanguageCode(Localization.getLocales()[0]?.languageCode) as string | null,
    [],
  )

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const [phase, setPhase] = useState<VoiceTypingPhase>('idle')
  const [savedAudio, setSavedAudio] = useState<SavedAudio | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [text, setText] = useState('')
  const [liveText, setLiveText] = useState('')
  const [isLive, setIsLive] = useState(false)
  const [error, setError] = useState<VoiceTypingError | null>(null)
  const [isPresented, setIsPresented] = useState(visible)
  const { workView, beginWork, endWork } = useLocalAiWorkProgress()
  const [summary, setSummary] = useState<TranscriptSummary | null>(null)
  const [summaryPhase, setSummaryPhase] = useState<SummaryPhase>('idle')
  const [keyPoints, setKeyPoints] = useState<string[]>([])
  const [sourceLanguage, setSourceLanguage] = useState<string | null>(null)
  const [targetLanguage, setTargetLanguage] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>(EMPTY_PROGRESS)
  const [noSpaceBytes, setNoSpaceBytes] = useState(0)
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const copied = copiedText !== null && copiedText === text

  const abortRef = useRef<AbortController | null>(null)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sampleRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)
  const savedAudioRef = useRef<SavedAudio | null>(null)
  const startingRef = useRef(false)
  const runIdRef = useRef(0)
  const phaseRef = useRef<VoiceTypingPhase>('idle')
  const liveRef = useRef<LiveTranscription | null>(null)
  const levelRef = useRef(0)
  const summaryPhaseRef = useRef<SummaryPhase>('idle')
  const downloadNamesRef = useRef<string[]>([])
  const translateRequestRef = useRef<{ source: string; target: string } | null>(null)

  const liveBars = useSharedValue<number[]>(
    Array.from({ length: RECORDING_BARS }, () => RESTING_BAR),
  )
  const sheetProgress = useSharedValue(visible ? 1 : 0)

  const updatePhase = useCallback((next: VoiceTypingPhase) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  const updateSummaryPhase = useCallback((next: SummaryPhase) => {
    summaryPhaseRef.current = next
    setSummaryPhase(next)
  }, [])

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (sampleRef.current) {
      clearInterval(sampleRef.current)
      sampleRef.current = null
    }
  }, [])

  const cancelLive = useCallback(() => {
    const live = liveRef.current
    liveRef.current = null
    live?.cancel()
  }, [])

  useEffect(
    () => () => {
      clearTimers()
      cancelLive()
      abortRef.current?.abort()
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    },
    [cancelLive, clearTimers],
  )

  const handleSheetShow = useCallback(() => {
    sheetProgress.value = withTiming(1, { duration: 340, easing: Easing.out(Easing.cubic) })
  }, [sheetProgress])

  useEffect(() => {
    if (visible) {
      sheetProgress.value = 0
      setIsPresented(true)
      return
    }
    sheetProgress.value = withTiming(
      0,
      { duration: 260, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(setIsPresented)(false)
      },
    )
  }, [sheetProgress, visible])

  const resetSummary = useCallback(() => {
    setSummary(null)
    updateSummaryPhase('idle')
  }, [updateSummaryPhase])

  const failWith = useCallback(
    (code: VoiceTypingError, cause?: unknown) => {
      hapticWarning()
      setError(errorFromCause(cause) ?? code)
      updatePhase('error')
    },
    [updatePhase],
  )

  const discardSavedAudio = useCallback(() => {
    const saved = savedAudioRef.current
    savedAudioRef.current = null
    setSavedAudio(null)
    if (saved) deleteLocalFile(saved.uri)
  }, [])

  const keepSavedAudio = useCallback((uri: string, durationMs: number) => {
    const saved = { uri, durationMs }
    savedAudioRef.current = saved
    setSavedAudio(saved)
  }, [])

  const processSource = useCallback(
    async (uri: string, deleteAfter: boolean) => {
      runIdRef.current += 1
      const runId = runIdRef.current
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setError(null)
      resetSummary()
      const isPdf = uri.toLowerCase().endsWith('.pdf')
      const onProgress = beginWork(
        mode === 'describe'
          ? WORK_KIND.DESCRIBE
          : mode !== 'extract'
            ? WORK_KIND.TRANSCRIBE
            : isPdf
              ? WORK_KIND.EXTRACT_PDF
              : WORK_KIND.EXTRACT_IMAGE,
      )
      updatePhase('transcribing')
      try {
        const result =
          mode === 'describe'
            ? await describeImage(uri, { onProgress })
            : mode !== 'extract'
              ? await transcribeAudioFile(uri, feature, featureConfig ?? {}, { onProgress })
              : isPdf
                ? await extractTextFromPdf(uri, { signal: controller.signal, onProgress })
                : await extractTextFromImage(uri, { onProgress })
        if (runId !== runIdRef.current) return
        if (!result) {
          failWith('empty')
          return
        }
        hapticSuccess()
        setText(result)
        updatePhase('preview')
      } catch (error) {
        if (runId !== runIdRef.current) return
        failWith('failed', error)
      } finally {
        if (deleteAfter) deleteLocalFile(uri)
      }
    },
    [beginWork, failWith, feature, featureConfig, mode, resetSummary, updatePhase],
  )

  const runTranslation = useCallback(async () => {
    const request = translateRequestRef.current
    if (!request) return
    const runId = runIdRef.current
    const onProgress = beginWork(WORK_KIND.TRANSLATE)
    updatePhase('transcribing')
    try {
      const translations = await translateParagraphs(paragraphs, request.source, request.target, {
        onProgress,
      })
      if (runId !== runIdRef.current) return
      const result = translations
        .map((line) => String(line ?? '').trim())
        .filter(Boolean)
        .join('\n')
      if (!result) {
        failWith('failed')
        return
      }
      hapticSuccess()
      setText(result)
      updatePhase('preview')
    } catch (error) {
      if (runId !== runIdRef.current) return
      failWith('failed', error)
    }
  }, [beginWork, failWith, paragraphs, updatePhase])

  const checkDownload = useCallback(() => {
    if (phaseRef.current !== 'downloading' && phaseRef.current !== 'waiting') return
    const names = downloadNamesRef.current
    if (names.length === 0) return
    const state = store.getState()
    const notice = getLocalAiNotice(state) as LocalAiNotice | null
    if (
      notice?.type === LOCAL_AI_NOTICE.INSUFFICIENT_SPACE &&
      notice.names?.some((name) => names.includes(name))
    ) {
      setNoSpaceBytes(notice.requiredBytes ?? 0)
      failWith('noSpace')
      dispatch({ type: clearLocalAiNotice.type })
      return
    }
    const status = selectLocalAiModelsStatus(state, names) as ModelsStatus
    setDownloadProgress((previous) =>
      previous.percent === status.percent && previous.missingBytes === status.missingBytes
        ? previous
        : { percent: status.percent, missingBytes: status.missingBytes },
    )
    if (status.status === LOCAL_AI_MODEL_STATUS.READY) {
      runTranslation()
      return
    }
    if (status.status === LOCAL_AI_MODEL_STATUS.FAILED) {
      failWith('downloadFailed')
      return
    }
    updatePhase(WAITING_STATUSES.includes(status.status) ? 'waiting' : 'downloading')
  }, [dispatch, failWith, runTranslation, store, updatePhase])

  useEffect(() => store.subscribe(checkDownload), [checkDownload, store])

  const startTranslate = useCallback(
    (source: string, target: string | null) => {
      runIdRef.current += 1
      setError(null)
      setText('')
      resetSummary()
      setSourceLanguage(source)
      setTargetLanguage(target)
      setDownloadProgress(EMPTY_PROGRESS)
      translateRequestRef.current = null
      downloadNamesRef.current = []
      if (paragraphs.length === 0) {
        failWith('empty')
        return
      }
      if (!target) {
        updatePhase('choose')
        return
      }
      translateRequestRef.current = { source, target }
      downloadNamesRef.current = getTranslationModelNames(source, target) as string[]
      updatePhase('downloading')
      dispatch({ type: setLocalAiTranslationTarget.type, payload: target })
      dispatch({ type: downloadLocalAiModels.type, payload: { names: downloadNamesRef.current } })
      checkDownload()
    },
    [checkDownload, dispatch, failWith, paragraphs, resetSummary, updatePhase],
  )

  const beginTranslate = useCallback(() => {
    const source =
      (detectTextLanguage(paragraphs.join('\n')) as string | null) ?? TRANSLATION_SOURCE_LANGUAGE
    startTranslate(
      source,
      pickTranslationTarget({ source, lastTarget, deviceLanguage }) as string | null,
    )
  }, [deviceLanguage, lastTarget, paragraphs, startTranslate])

  const runNoteTaskMode = useCallback(async () => {
    if (!isNoteTaskMode(mode)) return
    runIdRef.current += 1
    const runId = runIdRef.current
    setError(null)
    setText('')
    setKeyPoints([])
    resetSummary()
    const task = NOTE_TASK_BY_MODE[mode]
    const input = paragraphs.join('\n')
    if (input.trim().length < (scope === 'selection' ? 1 : NOTE_TASK_MIN_CHARS)) {
      failWith('empty')
      return
    }
    if (isRewriteTask(task) && input.length > REWRITE_MAX_CHARS) {
      failWith('tooLong')
      return
    }
    const onProgress = beginWork(isRewriteTask(task) ? WORK_KIND.REWRITE : WORK_KIND.NOTE_TASK, {
      input,
      targetRatio: mode === 'makeShorter' ? SHORTER_TARGET_RATIO : 1,
    })
    updatePhase('transcribing')
    try {
      const output = await runNoteTask(task, input, summaryConfig ?? {}, { onProgress })
      if (runId !== runIdRef.current) return
      let result = ''
      if (mode === 'summarizeNote') {
        const parsed = parseSummaryOutput(output) as TranscriptSummary
        if (parsed.summary || parsed.actionItems.length > 0) {
          setSummary(parsed)
          result = [parsed.summary, ...parsed.actionItems.map((item) => `• ${item}`)]
            .filter(Boolean)
            .join('\n')
        }
      } else if (mode === 'keyPoints') {
        const points = parseKeyPointsOutput(output) as string[]
        setKeyPoints(points)
        result = points.map((point) => `• ${point}`).join('\n')
      } else if (isRewriteTask(task)) {
        result = parseRewriteOutput(output) as string
      } else {
        result = parseTitleOutput(output) as string
      }
      if (!result) {
        failWith('failed')
        return
      }
      hapticSuccess()
      setText(result)
      updatePhase('preview')
    } catch (error) {
      if (runId !== runIdRef.current) return
      failWith('failed', error)
    }
  }, [beginWork, failWith, mode, paragraphs, resetSummary, scope, summaryConfig, updatePhase])

  const startBars = useCallback(
    (sample: () => number) => {
      liveBars.value = Array.from({ length: RECORDING_BARS }, () => RESTING_BAR)
      startTimeRef.current = Date.now()
      timerRef.current = setInterval(
        () => setElapsed(Date.now() - startTimeRef.current),
        TIMER_TICK_MS,
      )
      sampleRef.current = setInterval(() => {
        liveBars.value = [...liveBars.value.slice(-(RECORDING_BARS - 1)), sample()]
      }, BAR_SAMPLE_MS)
    },
    [liveBars],
  )

  const handleRecord = useCallback(async () => {
    if (startingRef.current) return
    startingRef.current = true
    hapticMedium()
    runIdRef.current += 1
    const runId = runIdRef.current
    setError(null)
    setText('')
    setLiveText('')
    setElapsed(0)
    resetSummary()
    discardSavedAudio()
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync()
      if (runId !== runIdRef.current) return
      if (!granted) {
        setError('micDenied')
        updatePhase('error')
        return
      }
      updatePhase('preparing')
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
      await setIsAudioActiveAsync(true)
      if (supportsLiveDictation()) {
        levelRef.current = 0
        try {
          const live = await startLiveTranscription(feature, featureConfig ?? {}, {
            onText: (transcript) => {
              if (runId === runIdRef.current) setLiveText(transcript)
            },
            onLevel: (level) => {
              levelRef.current = level
            },
          })
          if (runId !== runIdRef.current) {
            live.cancel()
            return
          }
          liveRef.current = live
          setIsLive(true)
          updatePhase('recording')
          startBars(() => Math.max(RESTING_BAR, levelRef.current))
          return
        } catch {
          if (runId !== runIdRef.current) return
        }
      }
      setIsLive(false)
      await recorder.prepareToRecordAsync()
      if (runId !== runIdRef.current) return
      recorder.record()
      updatePhase('recording')
      startBars(sampleAmp)
    } catch (error) {
      if (runId !== runIdRef.current) return
      failWith('failed', error)
    } finally {
      startingRef.current = false
    }
  }, [
    discardSavedAudio,
    failWith,
    feature,
    featureConfig,
    recorder,
    resetSummary,
    startBars,
    updatePhase,
  ])

  const stopRecorder = useCallback(async () => {
    clearTimers()
    try {
      await recorder.stop()
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
    } catch {}
    return recorder.uri
  }, [clearTimers, recorder])

  const transcribeSavedAudio = useCallback(async () => {
    const saved = savedAudioRef.current
    if (!saved) return
    hapticMedium()
    runIdRef.current += 1
    const runId = runIdRef.current
    setError(null)
    const onProgress = beginWork(WORK_KIND.TRANSCRIBE)
    updatePhase('transcribing')
    try {
      const transcript = await transcribeAudioFile(saved.uri, feature, featureConfig ?? {}, {
        onProgress,
      })
      if (runId !== runIdRef.current) return
      if (!transcript) {
        failWith('dictationFailed')
        return
      }
      discardSavedAudio()
      hapticSuccess()
      setText(transcript)
      updatePhase('preview')
    } catch (error) {
      if (runId !== runIdRef.current) return
      failWith('dictationFailed', error)
    }
  }, [beginWork, discardSavedAudio, failWith, feature, featureConfig, updatePhase])

  const finishLive = useCallback(
    async (live: LiveTranscription, durationMs: number) => {
      clearTimers()
      const runId = runIdRef.current
      updatePhase('transcribing')
      let transcript = ''
      try {
        transcript = await live.stop()
      } catch {}
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {})
      if (runId !== runIdRef.current) return
      if (transcript) {
        hapticSuccess()
        setText(transcript)
        updatePhase('preview')
        return
      }
      const uri = live.saveAudio()
      if (!uri) {
        failWith('empty')
        return
      }
      keepSavedAudio(uri, durationMs)
      await transcribeSavedAudio()
    },
    [clearTimers, failWith, keepSavedAudio, transcribeSavedAudio, updatePhase],
  )

  const handleStop = useCallback(async () => {
    hapticMedium()
    const durationMs = Date.now() - startTimeRef.current
    const live = liveRef.current
    if (live) {
      liveRef.current = null
      await finishLive(live, durationMs)
      return
    }
    const uri = await stopRecorder()
    if (!uri) {
      failWith('failed')
      return
    }
    keepSavedAudio(uri, durationMs)
    await transcribeSavedAudio()
  }, [failWith, finishLive, keepSavedAudio, stopRecorder, transcribeSavedAudio])

  const handleAttachAudio = useCallback(() => {
    const saved = savedAudioRef.current
    if (!saved || !onAttachAudio) return
    savedAudioRef.current = null
    setSavedAudio(null)
    hapticSuccess()
    updatePhase('idle')
    onAttachAudio(saved.uri, saved.durationMs)
  }, [onAttachAudio, updatePhase])

  useEffect(() => {
    if (!visible) return
    runIdRef.current += 1
    setText('')
    setLiveText('')
    setError(null)
    setElapsed(0)
    setKeyPoints([])
    endWork()
    resetSummary()
    if (mode === 'translate') {
      beginTranslate()
      return
    }
    if (isNoteTaskMode(mode)) {
      runNoteTaskMode()
      return
    }
    if (usesSource) {
      updatePhase('transcribing')
      return
    }
    updatePhase('idle')
    handleRecord()
  }, [visible])

  useEffect(() => {
    if (!visible || !usesSource || !sourceUri) return
    processSource(sourceUri, false)
  }, [sourceUri, visible])

  const handleChooseTarget = useCallback(
    (language: string) => {
      if (!sourceLanguage || language === sourceLanguage) return
      if (phaseRef.current === 'transcribing') return
      if (language === targetLanguage && phaseRef.current === 'preview') return
      hapticSelection()
      startTranslate(sourceLanguage, language)
    },
    [sourceLanguage, startTranslate, targetLanguage],
  )

  const handleChooseSource = useCallback(
    (language: string) => {
      if (language === sourceLanguage || phaseRef.current === 'transcribing') return
      hapticSelection()
      const target =
        targetLanguage && targetLanguage !== language
          ? targetLanguage
          : (pickTranslationTarget({ source: language, lastTarget, deviceLanguage }) as
              | string
              | null)
      startTranslate(language, target)
    },
    [deviceLanguage, lastTarget, sourceLanguage, startTranslate, targetLanguage],
  )

  const handleDownloadNow = useCallback(() => {
    hapticMedium()
    for (const name of downloadNamesRef.current) {
      dispatch({ type: downloadLocalAiModelNow.type, payload: { name } })
    }
  }, [dispatch])

  const handleReportProblem = useCallback((subject: string) => {
    Linking.openURL(`mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(subject)}`).catch(() => {})
  }, [])

  const handleAgain = useCallback(() => {
    if (error === 'unstable') resetLocalAiModelHealth()
    if (mode === 'translate') {
      if (sourceLanguage) startTranslate(sourceLanguage, targetLanguage)
      else beginTranslate()
      return
    }
    if (isNoteTaskMode(mode)) {
      runNoteTaskMode()
      return
    }
    if (usesSource) {
      if (sourceUri) processSource(sourceUri, false)
      return
    }
    handleRecord()
  }, [
    beginTranslate,
    error,
    handleRecord,
    mode,
    processSource,
    runNoteTaskMode,
    sourceLanguage,
    sourceUri,
    startTranslate,
    targetLanguage,
    usesSource,
  ])

  const handleSummarize = useCallback(async () => {
    if (!text || summaryPhaseRef.current === 'working') return
    hapticMedium()
    const runId = runIdRef.current
    updateSummaryPhase('working')
    try {
      const parsed = parseSummaryOutput(await summarizeTranscript(text, summaryConfig ?? {}))
      if (runId !== runIdRef.current) return
      if (!parsed.summary && parsed.actionItems.length === 0) {
        hapticWarning()
        updateSummaryPhase('failed')
        return
      }
      hapticSuccess()
      setSummary(parsed)
      updateSummaryPhase('idle')
    } catch {
      if (runId !== runIdRef.current) return
      hapticWarning()
      updateSummaryPhase('failed')
    }
  }, [summaryConfig, text, updateSummaryPhase])

  const handleCopy = useCallback(async () => {
    if (!text) return
    await Clipboard.setStringAsync(text)
    hapticSuccess()
    setCopiedText(text)
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    copiedTimerRef.current = setTimeout(() => setCopiedText(null), COPIED_RESET_MS)
  }, [text])

  const handleClose = useCallback(async () => {
    runIdRef.current += 1
    startingRef.current = false
    abortRef.current?.abort()
    clearTimers()
    if (liveRef.current) {
      cancelLive()
    } else if (phaseRef.current === 'recording') {
      const uri = await stopRecorder()
      deleteLocalFile(uri)
    }
    if (phaseRef.current === 'transcribing' || summaryPhaseRef.current === 'working') {
      cancelLocalAiTask().catch(() => {})
    }
    if (usesSource) deleteLocalFile(sourceUri)
    discardSavedAudio()
    translateRequestRef.current = null
    downloadNamesRef.current = []
    updatePhase('idle')
    updateSummaryPhase('idle')
    onClose()
  }, [
    cancelLive,
    clearTimers,
    discardSavedAudio,
    onClose,
    sourceUri,
    stopRecorder,
    updatePhase,
    updateSummaryPhase,
    usesSource,
  ])

  const handleInsert = useCallback(
    (action: ApplyAction = 'insert') => {
      if (phaseRef.current !== 'preview' || !text || summaryPhaseRef.current === 'working') return
      hapticSuccess()
      if (usesSource) deleteLocalFile(sourceUri)
      updatePhase('idle')
      onInsert(text, summary, {
        language: mode === 'translate' ? targetLanguage : null,
        bullets: mode === 'keyPoints' ? keyPoints : [],
        action,
      })
    },
    [keyPoints, mode, onInsert, sourceUri, summary, targetLanguage, text, updatePhase, usesSource],
  )

  useEffect(() => {
    if (phase !== 'transcribing') endWork()
  }, [endWork, phase])

  const rewriteDiff = useMemo(
    () =>
      phase === 'preview' && scope === 'selection' && isRewriteMode(mode) && text
        ? getRewriteDiff(paragraphs.join('\n'), text)
        : null,
    [mode, paragraphs, phase, scope, text],
  )

  const handleOpenSettings = useCallback(() => {
    Linking.openSettings().catch(() => {})
  }, [])

  return {
    phase,
    elapsed,
    text,
    liveText,
    isLive,
    error,
    workView,
    summary,
    summaryPhase,
    canSummarize: summaryAvailable && mode === 'transcribe' && phase === 'preview',
    canReplace: scope === 'selection' && (mode === 'translate' || isRewriteMode(mode)),
    rewriteDiff,
    sourceLanguage,
    targetLanguage,
    translateLanguages: TRANSLATE_LANGUAGES,
    downloadProgress,
    noSpaceBytes,
    handleChooseTarget,
    handleChooseSource,
    handleDownloadNow,
    handleReportProblem,
    copied,
    handleCopy,
    isPresented,
    liveBars,
    sheetProgress,
    handleSheetShow,
    handleRecord,
    handleStop,
    handleAgain,
    handleSummarize,
    handleClose,
    handleInsert,
    handleOpenSettings,
    hasSavedAudio: !!savedAudio,
    canAttachAudio: !!savedAudio && !!onAttachAudio,
    handleRetrySavedAudio: transcribeSavedAudio,
    handleAttachAudio,
  }
}
