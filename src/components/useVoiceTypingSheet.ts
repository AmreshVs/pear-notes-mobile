import { useCallback, useEffect, useRef, useState } from 'react'
import { Linking } from 'react-native'
import { Easing, runOnJS, useSharedValue, withTiming } from 'react-native-reanimated'
import { useSelector } from 'react-redux'
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  useAudioRecorder,
} from 'expo-audio'
import * as Clipboard from 'expo-clipboard'
import { File } from 'expo-file-system'

import { LOCAL_AI_FEATURE } from '@pear-notes/core/store/services/localAiCatalog.js'
import { getLocalAiFeatureConfig } from '@pear-notes/core/store/slices/localAiSlice.js'

import { RECORDING_BARS, sampleAmp } from '@/components/useAudioRecorderModal'
import { hapticMedium, hapticSuccess, hapticWarning } from '@/lib/haptics'
import {
  cancelLocalAiTask,
  extractTextFromImage,
  extractTextFromPdf,
  transcribeAudioFile,
} from '@/lib/localAi/qvacAdapter'

export type VoiceTypingMode = 'dictate' | 'transcribe' | 'extract'

const COPIED_RESET_MS = 2000

const FEATURE_BY_MODE = {
  dictate: LOCAL_AI_FEATURE.VOICE_TYPING,
  transcribe: LOCAL_AI_FEATURE.TRANSCRIBE_RECORDINGS,
  extract: LOCAL_AI_FEATURE.EXTRACT_TEXT,
}
export type VoiceTypingPhase = 'idle' | 'recording' | 'transcribing' | 'preview' | 'error'
export type VoiceTypingError = 'micDenied' | 'failed' | 'empty'

interface VoiceTypingSheetOptions {
  visible: boolean
  mode: VoiceTypingMode
  sourceUri: string | null
  onInsert: (text: string) => void
  onClose: () => void
}

interface FeatureConfig {
  tier?: string
  language?: string
}

function deleteLocalFile(uri: string | null) {
  if (!uri) return
  try {
    const file = new File(uri)
    if (file.exists) file.delete()
  } catch {}
}

export function useVoiceTypingSheet({
  visible,
  mode,
  sourceUri,
  onInsert,
  onClose,
}: VoiceTypingSheetOptions) {
  const feature = FEATURE_BY_MODE[mode]
  const usesSource = mode !== 'dictate'
  const featureConfig = useSelector((state) => getLocalAiFeatureConfig(state, feature)) as
    | FeatureConfig
    | undefined

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const [phase, setPhase] = useState<VoiceTypingPhase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [text, setText] = useState('')
  const [error, setError] = useState<VoiceTypingError | null>(null)
  const [isPresented, setIsPresented] = useState(visible)
  const [pageProgress, setPageProgress] = useState<{ page: number; total: number } | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copied = copiedText !== null && copiedText === text

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sampleRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)
  const runIdRef = useRef(0)
  const phaseRef = useRef<VoiceTypingPhase>('idle')

  const liveBars = useSharedValue<number[]>(Array.from({ length: RECORDING_BARS }, () => 0.16))
  const sheetProgress = useSharedValue(visible ? 1 : 0)

  const updatePhase = useCallback((next: VoiceTypingPhase) => {
    phaseRef.current = next
    setPhase(next)
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

  useEffect(() => clearTimers, [clearTimers])

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

  const transcribe = useCallback(
    async (uri: string, deleteAfter: boolean) => {
      runIdRef.current += 1
      const runId = runIdRef.current
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setError(null)
      setPageProgress(null)
      updatePhase('transcribing')
      try {
        const result =
          mode !== 'extract'
            ? await transcribeAudioFile(uri, feature, featureConfig ?? {})
            : uri.toLowerCase().endsWith('.pdf')
              ? await extractTextFromPdf(uri, {
                  signal: controller.signal,
                  onProgress: (progress) => {
                    if (runId === runIdRef.current) setPageProgress(progress)
                  },
                })
              : await extractTextFromImage(uri)
        if (runId !== runIdRef.current) return
        if (!result) {
          hapticWarning()
          setError('empty')
          updatePhase('error')
          return
        }
        hapticSuccess()
        setText(result)
        updatePhase('preview')
      } catch {
        if (runId !== runIdRef.current) return
        hapticWarning()
        setError('failed')
        updatePhase('error')
      } finally {
        if (deleteAfter) deleteLocalFile(uri)
      }
    },
    [feature, featureConfig, mode, updatePhase],
  )

  const handleRecord = useCallback(async () => {
    hapticMedium()
    const { granted } = await AudioModule.requestRecordingPermissionsAsync()
    if (!granted) {
      setError('micDenied')
      updatePhase('error')
      return
    }
    setError(null)
    setText('')
    setElapsed(0)
    liveBars.value = Array.from({ length: RECORDING_BARS }, () => 0.16)
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
      await setIsAudioActiveAsync(true)
      await recorder.prepareToRecordAsync()
      recorder.record()
      updatePhase('recording')
      startTimeRef.current = Date.now()
      timerRef.current = setInterval(() => setElapsed(Date.now() - startTimeRef.current), 50)
      sampleRef.current = setInterval(() => {
        liveBars.value = [...liveBars.value.slice(-(RECORDING_BARS - 1)), sampleAmp()]
      }, 90)
    } catch {
      setError('failed')
      updatePhase('error')
    }
  }, [liveBars, recorder, updatePhase])

  const stopRecorder = useCallback(async () => {
    clearTimers()
    try {
      await recorder.stop()
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
    } catch {}
    return recorder.uri
  }, [clearTimers, recorder])

  const handleStop = useCallback(async () => {
    hapticMedium()
    const uri = await stopRecorder()
    if (!uri) {
      setError('failed')
      updatePhase('error')
      return
    }
    await transcribe(uri, true)
  }, [stopRecorder, transcribe, updatePhase])

  useEffect(() => {
    if (!visible) return
    runIdRef.current += 1
    setText('')
    setError(null)
    setElapsed(0)
    if (usesSource) {
      updatePhase('transcribing')
      return
    }
    updatePhase('idle')
    handleRecord()
  }, [visible])

  useEffect(() => {
    if (!visible || !usesSource || !sourceUri) return
    transcribe(sourceUri, false)
  }, [sourceUri, visible])

  const handleAgain = useCallback(() => {
    if (usesSource) {
      if (sourceUri) transcribe(sourceUri, false)
      return
    }
    handleRecord()
  }, [handleRecord, sourceUri, transcribe, usesSource])

  useEffect(
    () => () => {
      abortRef.current?.abort()
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    },
    [],
  )

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
    abortRef.current?.abort()
    if (phaseRef.current === 'recording') {
      const uri = await stopRecorder()
      deleteLocalFile(uri)
    }
    if (phaseRef.current === 'transcribing') cancelLocalAiTask().catch(() => {})
    if (usesSource) deleteLocalFile(sourceUri)
    updatePhase('idle')
    onClose()
  }, [onClose, sourceUri, stopRecorder, updatePhase, usesSource])

  const handleInsert = useCallback(() => {
    if (phaseRef.current !== 'preview' || !text) return
    hapticSuccess()
    if (usesSource) deleteLocalFile(sourceUri)
    updatePhase('idle')
    onInsert(text)
  }, [onInsert, sourceUri, text, updatePhase, usesSource])

  const handleOpenSettings = useCallback(() => {
    Linking.openSettings().catch(() => {})
  }, [])

  return {
    phase,
    elapsed,
    text,
    error,
    pageProgress,
    copied,
    handleCopy,
    isPresented,
    liveBars,
    sheetProgress,
    handleSheetShow,
    handleRecord,
    handleStop,
    handleAgain,
    handleClose,
    handleInsert,
    handleOpenSettings,
  }
}
