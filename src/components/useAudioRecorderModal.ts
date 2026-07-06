import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
} from 'expo-audio'
import * as Haptics from 'expo-haptics'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Platform } from 'react-native'
import {
  Easing,
  runOnJS,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'

import { useToast } from '@/providers/ToastProvider'

const RECORDING_WINDOW_MS = 30000
const RECORDING_BARS = 52
const RECORDING_BAR_W = 3
const RECORDING_BAR_GAP = 3

let energy = 0.4
function sampleAmp() {
  energy = Math.max(0.14, Math.min(0.98, energy + (Math.random() - 0.48) * 0.18))
  return Math.max(0.12, Math.min(1, energy + (Math.random() - 0.5) * 0.28))
}

export { RECORDING_BARS, RECORDING_BAR_W, RECORDING_BAR_GAP, RECORDING_WINDOW_MS }

export function fmtTimer(ms: number) {
  const s = Math.floor(ms / 1000)
  const cs = Math.floor((ms % 1000) / 10)
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

export function fmtShort(sec: number) {
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`
}

interface AudioRecorderModalProps {
  visible: boolean
  onDone: (uri: string, durationMs: number) => void
  onCancel: () => void
}

export interface AudioRecorderModalState {
  isRecording: boolean
  isPlaying: boolean
  hasRecording: boolean
  showRecordingSurface: boolean
  currentPlaybackMs: number
  timerMs: number
  totalTimelineMs: number
  elapsed: number
  recordedDuration: number
  isPresented: boolean
  liveBars: SharedValue<number[]>
  sheetProgress: SharedValue<number>
  recordingWindowStartSec: number
  recordingMidSec: number
  recordingEndSec: number
  status: { title: string; subtitle: string }
  handleSheetShow: () => void
  handleRecord: () => Promise<void>
  handleStop: () => Promise<void>
  handlePlayPause: () => Promise<void>
  handleSkip: (deltaSec: number) => Promise<void>
  handleSeekStart: () => void
  handleSeekChange: (value: number) => void
  handleSeekComplete: (value: number) => Promise<void>
  handleDoneInner: () => Promise<void>
  handleCancelInner: () => Promise<void>
}

export function useAudioRecorderModal({
  visible,
  onDone,
  onCancel,
}: AudioRecorderModalProps): AudioRecorderModalState {
  const { t } = useTranslation()
  const { showToast } = useToast()

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const player = useAudioPlayer(null)
  const playerStatus = useAudioPlayerStatus(player)

  const [phase, setPhase] = useState<'idle' | 'recording' | 'stopped' | 'playing'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [playMs, setPlayMs] = useState(0)
  const [hasPermission, setHasPermission] = useState(false)
  const [isPresented, setIsPresented] = useState(visible)
  const [recordedUri, setRecordedUri] = useState<string | null>(null)
  const [recordedDuration, setRecordedDuration] = useState(0)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [scrubMs, setScrubMs] = useState(0)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sampleRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)
  const durationRef = useRef(0)
  const resumeAfterSeekRef = useRef(false)
  const isSeekingRef = useRef(false)

  const onCancelRef = useRef(onCancel)
  useEffect(() => {
    onCancelRef.current = onCancel
  }, [onCancel])

  const liveBars = useSharedValue<number[]>(Array.from({ length: RECORDING_BARS }, () => 0.16))
  const sheetProgress = useSharedValue(visible ? 1 : 0)

  const isRecording = phase === 'recording'
  const isPlaying = phase === 'playing'
  const hasRecording = !!recordedUri
  const showRecordingSurface = !hasRecording
  const currentPlaybackMs = isScrubbing ? scrubMs : playMs
  const timerMs = isRecording ? elapsed : currentPlaybackMs
  const totalTimelineMs = hasRecording
    ? Math.max(recordedDuration, 1)
    : Math.max(elapsed, RECORDING_WINDOW_MS)
  const recordingCurrentSec = Math.floor(elapsed / 1000)
  const recordingWindowStartSec = Math.max(0, recordingCurrentSec - 2)
  const recordingMidSec = recordingCurrentSec
  const recordingEndSec = recordingCurrentSec + 2

  useEffect(() => {
    return () => {
      sheetProgress.value = 0
      onCancelRef.current?.()
    }
  }, [sheetProgress])

  useEffect(() => {
    if (!visible) return
    AudioModule.requestRecordingPermissionsAsync().then(({ granted }) => setHasPermission(granted))
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [visible])

  useEffect(() => {
    if (!visible) return
    setPhase('idle')
    setElapsed(0)
    setPlayMs(0)
    setRecordedUri(null)
    setRecordedDuration(0)
    durationRef.current = 0
    energy = 0.4
    liveBars.value = Array.from({ length: RECORDING_BARS }, () => 0.16)
  }, [visible, liveBars])

  const handleSheetShow = useCallback(() => {
    sheetProgress.value = withTiming(1, {
      duration: 340,
      easing: Easing.out(Easing.cubic),
    })
  }, [sheetProgress])

  useEffect(() => {
    if (visible) {
      sheetProgress.value = 0
      setIsPresented(true)
      return
    }

    sheetProgress.value = withTiming(
      0,
      {
        duration: 260,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(setIsPresented)(false)
        }
      },
    )
  }, [sheetProgress, visible])

  useEffect(() => {
    if (!hasRecording) return
    if (isScrubbing || isSeekingRef.current) return

    setPlayMs(playerStatus.currentTime * 1000)

    if (playerStatus.didJustFinish) {
      setPhase('stopped')
      setPlayMs(0)
      setScrubMs(0)
      player.seekTo(0).catch(() => {})
      return
    }

    if (playerStatus.playing && phase !== 'recording') {
      setPhase('playing')
      return
    }

    if (!playerStatus.playing && phase === 'playing' && !resumeAfterSeekRef.current) {
      setPhase('stopped')
    }
  }, [
    hasRecording,
    isScrubbing,
    phase,
    player,
    playerStatus.currentTime,
    playerStatus.didJustFinish,
    playerStatus.playing,
  ])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (sampleRef.current) {
      clearInterval(sampleRef.current)
      sampleRef.current = null
    }
  }, [])

  const stopPlayback = useCallback(() => {
    try {
      player.pause()
    } catch {}
  }, [player])

  const handleRecord = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    if (!hasPermission) {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync()
      setHasPermission(granted)
      if (!granted) {
        if (Platform.OS === 'android') {
          showToast(t('audioRecorder.errors.micMessage'))
        } else {
          Alert.alert(t('audioRecorder.errors.micTitle'), t('audioRecorder.errors.micMessage'))
        }
        return
      }
    }

    stopPlayback()
    clearTimer()
    setElapsed(0)
    setPlayMs(0)
    setScrubMs(0)
    setIsScrubbing(false)
    setRecordedUri(null)
    setRecordedDuration(0)
    durationRef.current = 0
    liveBars.value = Array.from({ length: RECORDING_BARS }, () => 0.16)

    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
      await setIsAudioActiveAsync(true)
      await recorder.prepareToRecordAsync()
      recorder.record()
      setPhase('recording')
      startTimeRef.current = Date.now()
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - startTimeRef.current)
      }, 50)
      sampleRef.current = setInterval(() => {
        liveBars.value = [...liveBars.value.slice(-(RECORDING_BARS - 1)), sampleAmp()]
      }, 90)
    } catch (err: any) {
      console.error('[AudioRecorderModal][handleRecord] failed:', err)
      if (Platform.OS === 'android') {
        showToast(err?.message ?? t('audioRecorder.errors.recordDefault'))
      } else {
        Alert.alert(
          t('audioRecorder.errors.recordTitle'),
          err?.message ?? t('audioRecorder.errors.recordDefault'),
        )
      }
    }
  }, [clearTimer, hasPermission, liveBars, recorder, stopPlayback, t])

  const handleStop = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    clearTimer()
    try {
      await recorder.stop()
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
      const duration = elapsed
      durationRef.current = duration
      setRecordedDuration(duration)
      setPlayMs(0)
      setScrubMs(0)
      setPhase('stopped')
      const uri = recorder.uri
      setRecordedUri(uri)
      if (uri) player.replace({ uri })
    } catch (err: any) {
      console.error('[AudioRecorderModal][Stop]', err)
      setPhase('idle')
    }
  }, [clearTimer, elapsed, player, recorder])

  const handlePlayPause = useCallback(async () => {
    if (!recordedUri) return

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    try {
      if (playerStatus.playing) {
        stopPlayback()
        setPhase('stopped')
        return
      }

      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
      await setIsAudioActiveAsync(true)
      const duration = recordedDuration || 1
      const startPos = playMs >= duration - 100 ? 0 : playMs
      await player.seekTo(startPos / 1000)
      setPlayMs(startPos)
      setScrubMs(startPos)
      player.play()
      setPhase('playing')
    } catch (err: any) {
      console.error('[AudioRecorderModal][Play]', err)
      stopPlayback()
      setPhase('stopped')
    }
  }, [playMs, player, playerStatus.playing, recordedDuration, recordedUri, stopPlayback])

  const handleSkip = useCallback(
    async (deltaSec: number) => {
      if (!recordedUri) return

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      const currentMs = player.currentTime * 1000
      const newMs = Math.max(0, Math.min(recordedDuration || 1, currentMs + deltaSec * 1000))

      try {
        const wasPlaying = playerStatus.playing
        resumeAfterSeekRef.current = wasPlaying
        if (wasPlaying) {
          player.pause()
        }
        await player.seekTo(newMs / 1000)
        setPlayMs(newMs)
        setScrubMs(newMs)
        if (wasPlaying) {
          player.play()
          resumeAfterSeekRef.current = false
          setPhase('playing')
        } else {
          resumeAfterSeekRef.current = false
          setPhase('stopped')
        }
      } catch (err) {
        resumeAfterSeekRef.current = false
        console.error('[AudioRecorderModal][Skip]', err)
      }
    },
    [player, playerStatus.playing, recordedDuration, recordedUri],
  )

  const handleSeekStart = useCallback(() => {
    if (!hasRecording) return
    setIsScrubbing(true)
    setScrubMs(playMs)
  }, [hasRecording, playMs])

  const handleSeekChange = useCallback((value: number) => {
    setScrubMs(value)
  }, [])

  const handleSeekComplete = useCallback(
    async (value: number) => {
      if (!hasRecording) return
      const wasPlaying = playerStatus.playing || phase === 'playing'
      setScrubMs(value)
      setPlayMs(value)
      isSeekingRef.current = true
      try {
        resumeAfterSeekRef.current = wasPlaying
        if (wasPlaying) {
          player.pause()
        }
        await player.seekTo(value / 1000)
        setPlayMs(value)
        setScrubMs(value)
        if (wasPlaying) {
          player.play()
          setPhase('playing')
        } else {
          setPhase('stopped')
        }
      } catch (err) {
        console.error('[AudioRecorderModal][Seek]', err)
      } finally {
        isSeekingRef.current = false
        resumeAfterSeekRef.current = false
        setIsScrubbing(false)
      }
    },
    [hasRecording, phase, player, playerStatus.playing],
  )

  const handleDoneInner = useCallback(async () => {
    stopPlayback()
    try {
      if (phase === 'recording') {
        clearTimer()
        await recorder.stop()
        await setAudioModeAsync({ allowsRecording: false })
        durationRef.current = elapsed
      }
    } catch {}

    const uri = recordedUri ?? recorder.uri
    if (!uri) {
      onCancel()
      return
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    onDone(uri, durationRef.current || elapsed)
  }, [clearTimer, elapsed, onCancel, onDone, phase, recordedUri, recorder, stopPlayback])

  const handleCancelInner = useCallback(async () => {
    stopPlayback()
    clearTimer()
    try {
      if (phase === 'recording') {
        await recorder.stop()
        await setAudioModeAsync({ allowsRecording: false })
      }
    } catch {}
    onCancel()
  }, [clearTimer, onCancel, phase, recorder, stopPlayback])

  const status = useMemo(() => {
    if (hasRecording) {
      return {
        title: t('audioRecorder.status.capturedTitle'),
        subtitle: t('audioRecorder.status.capturedSubtitle'),
      }
    }
    return {
      title: t('audioRecorder.status.idleTitle'),
      subtitle: t('audioRecorder.status.idleSubtitle'),
    }
  }, [hasRecording, t])

  return {
    isRecording,
    isPlaying,
    hasRecording,
    showRecordingSurface,
    currentPlaybackMs,
    timerMs,
    totalTimelineMs,
    elapsed,
    recordedDuration,
    isPresented,
    liveBars,
    sheetProgress,
    recordingWindowStartSec,
    recordingMidSec,
    recordingEndSec,
    status,
    handleSheetShow,
    handleRecord,
    handleStop,
    handlePlayPause,
    handleSkip,
    handleSeekStart,
    handleSeekChange,
    handleSeekComplete,
    handleDoneInner,
    handleCancelInner,
  }
}
