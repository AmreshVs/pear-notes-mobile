import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useMaterial3Theme as useMD3Theme } from '@pchmn/expo-material3-theme'
import Slider from '@react-native-community/slider'
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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text, Theme, useTheme, useThemedStyles } from '@/components/Themed'

const TIMELINE_H = 88
const RECORDING_WINDOW_MS = 30000
const RECORDING_BARS = 52
const RECORDING_BAR_W = 3
const RECORDING_BAR_GAP = 3
const RECORDING_BAR_STEP = RECORDING_BAR_W + RECORDING_BAR_GAP

let energy = 0.4
function sampleAmp() {
  energy = Math.max(0.14, Math.min(0.98, energy + (Math.random() - 0.48) * 0.18))
  return Math.max(0.12, Math.min(1, energy + (Math.random() - 0.5) * 0.28))
}

function RecordingWaveBar({
  index,
  values,
  color,
  active,
}: {
  index: number
  values: SharedValue<number[]>
  color: string
  active: boolean
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const amp = values.value[index] ?? 0.16
    return {
      height: withTiming(active ? Math.max(16, amp * 84) : 20, {
        duration: 120,
        easing: Easing.out(Easing.quad),
      }),
      backgroundColor: color,
      opacity: withTiming(active ? (index === RECORDING_BARS - 1 ? 1 : 0.92) : 0.22, {
        duration: 160,
        easing: Easing.out(Easing.quad),
      }),
    }
  }, [active, color, index, values])

  return <Animated.View style={[stylesStatic.recordingBar, animatedStyle]} />
}

const stylesStatic = StyleSheet.create({
  recordingBar: {
    width: RECORDING_BAR_W,
    borderRadius: 999,
  },
})

interface AudioRecorderModalProps {
  visible: boolean
  onDone: (uri: string, durationMs: number) => void
  onCancel: () => void
}

function fmtTimer(ms: number) {
  const s = Math.floor(ms / 1000)
  const cs = Math.floor((ms % 1000) / 10)
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

function fmtShort(sec: number) {
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`
}

interface SheetBodyProps {
  styles: ReturnType<typeof createStyles>
  colors: Theme['colors']
  isDark: boolean
  status: { title: string; subtitle: string }
  hasRecording: boolean
  showRecordingSurface: boolean
  isRecording: boolean
  isPlaying: boolean
  liveBars: SharedValue<number[]>
  currentPlaybackMs: number
  recordedDuration: number
  lineTrack: string
  lineFill: string
  timerMs: number
  timerColor: string
  totalTimelineMs: number
  recordingWindowStartSec: number
  recordingMidSec: number
  recordingEndSec: number
  bottomInset: number
  onCancel: () => void
  onDone: () => void
  onRecord: () => void
  onStop: () => void
  onPlayPause: () => void
  onSkip: (delta: number) => void
  onSeekStart: () => void
  onSeekChange: (v: number) => void
  onSeekComplete: (v: number) => Promise<void>
}

function SheetBody({
  styles,
  colors,
  isDark,
  status,
  hasRecording,
  showRecordingSurface,
  isRecording,
  isPlaying,
  liveBars,
  currentPlaybackMs,
  recordedDuration,
  lineTrack,
  lineFill,
  timerMs,
  timerColor,
  totalTimelineMs,
  recordingWindowStartSec,
  recordingMidSec,
  recordingEndSec,
  bottomInset,
  onCancel,
  onDone,
  onRecord,
  onStop,
  onPlayPause,
  onSkip,
  onSeekStart,
  onSeekChange,
  onSeekComplete,
}: SheetBodyProps) {
  return (
    <>
      <View style={styles.grabber} />

      <View style={styles.headerRow}>
        <Pressable
          hitSlop={12}
          onPress={onCancel}
          style={({ pressed }) => [styles.headerIconButton, pressed && styles.headerActionPressed]}
        >
          <MaterialCommunityIcons name="close" size={16} color={colors.textSecondary} />
        </Pressable>

        <Pressable
          disabled={!hasRecording && !isRecording}
          hitSlop={12}
          onPress={onDone}
          style={({ pressed }) => [
            styles.headerIconButton,
            (!hasRecording && !isRecording) || pressed ? styles.headerActionPressed : null,
          ]}
        >
          <MaterialCommunityIcons
            name="check"
            size={16}
            color={!hasRecording && !isRecording ? colors.textMuted : colors.primary}
          />
        </Pressable>
      </View>

      <View style={styles.heroBlock}>
        <Text style={[styles.heroTitle, { color: colors.text }]}>{status.title}</Text>
        <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
          {status.subtitle}
        </Text>
      </View>

      <View style={[styles.timelineWrap, hasRecording && styles.timelineWrapPlayback]}>
        {showRecordingSurface ? (
          <View style={styles.recordingWave}>
            <View style={styles.recordingBarsLane}>
              <View style={styles.recordingBarsRow}>
                {Array.from({ length: RECORDING_BARS }, (_, index) => (
                  <RecordingWaveBar
                    key={index}
                    active={isRecording}
                    index={index}
                    values={liveBars}
                    color={colors.error}
                  />
                ))}
              </View>
            </View>
            <View style={styles.recordingNeedle} pointerEvents="none">
              <View
                style={[
                  styles.recordingNeedleCap,
                  { backgroundColor: colors.error, opacity: isRecording ? 1 : 0.56 },
                ]}
              />
              <View
                style={[
                  styles.recordingNeedleStem,
                  { backgroundColor: colors.error, opacity: isRecording ? 1 : 0.46 },
                ]}
              />
            </View>
          </View>
        ) : (
          <View style={styles.timelineOuter}>
            <View style={styles.playbackTrackWrap}>
              <View style={[styles.timelineTrack, { backgroundColor: lineTrack }]} />
              <Slider
                value={currentPlaybackMs}
                minimumValue={0}
                maximumValue={Math.max(recordedDuration, 1)}
                minimumTrackTintColor={lineFill}
                maximumTrackTintColor="transparent"
                thumbTintColor={colors.primary}
                onSlidingStart={onSeekStart}
                onValueChange={onSeekChange}
                onSlidingComplete={onSeekComplete}
                style={styles.playbackSlider}
              />
            </View>
            <View style={styles.playbackTimeRow}>
              <Text style={[styles.playbackSideTime, { color: colors.textMuted }]}>
                {fmtShort(currentPlaybackMs / 1000)}
              </Text>
              <Text style={[styles.playbackSideTime, { color: colors.textMuted }]}>
                {fmtShort(totalTimelineMs / 1000)}
              </Text>
            </View>
          </View>
        )}

        {showRecordingSurface && (
          <View style={styles.recordingRuler}>
            <Text style={[styles.recordingTick, { color: colors.textMuted }]}>
              {fmtShort(isRecording ? recordingWindowStartSec : 0)}
            </Text>
            <Text style={[styles.recordingTick, { color: colors.textMuted }]}>
              {fmtShort(isRecording ? recordingMidSec : 0)}
            </Text>
            <Text style={[styles.recordingTick, { color: colors.textMuted }]}>
              {fmtShort(isRecording ? recordingEndSec : 2)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.timerBlock}>
        <Text style={[styles.timerLabel, { color: colors.textSecondary }]}>
          {hasRecording ? 'Playback position' : 'Recording time'}
        </Text>
        <Text style={[styles.timer, { color: timerColor }]}>{fmtTimer(timerMs)}</Text>
      </View>

      <View style={[styles.controlsSection, hasRecording && styles.controlsSectionPlayback]}>
        {hasRecording ? (
          <>
            <View style={styles.transportRow}>
              <Pressable
                hitSlop={12}
                onPress={() => onSkip(-15)}
                style={({ pressed }) => [
                  styles.secondaryTransport,
                  pressed && styles.transportPressed,
                ]}
              >
                <MaterialCommunityIcons name="rewind-15" size={24} color={colors.text} />
              </Pressable>

              <Pressable
                onPress={onPlayPause}
                style={({ pressed }) => [
                  styles.primaryTransport,
                  { backgroundColor: colors.text },
                  pressed && styles.transportPressed,
                ]}
              >
                <MaterialCommunityIcons
                  name={isPlaying ? 'pause' : 'play'}
                  size={24}
                  color={isDark ? '#000000' : '#ffffff'}
                />
              </Pressable>

              <Pressable
                hitSlop={12}
                onPress={() => onSkip(15)}
                style={({ pressed }) => [
                  styles.secondaryTransport,
                  pressed && styles.transportPressed,
                ]}
              >
                <MaterialCommunityIcons name="fast-forward-15" size={24} color={colors.text} />
              </Pressable>
            </View>

            <Pressable
              onPress={onRecord}
              style={({ pressed }) => [
                styles.rerecordButton,
                { backgroundColor: isDark ? colors.surfaceSecondary : 'rgba(0,0,0,0.05)' },
                pressed && styles.transportPressed,
              ]}
            >
              <MaterialCommunityIcons name="refresh" size={16} color={colors.text} />
              <Text style={[styles.rerecordText, { color: colors.text }]}>Re-record</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.recordStage}>
              <Pressable
                onPress={isRecording ? onStop : onRecord}
                style={({ pressed }) => [
                  styles.recordButton,
                  pressed && styles.recordButtonPressed,
                ]}
              >
                <View style={[styles.recordOuterRing, { borderColor: colors.error }]}>
                  <View
                    style={[
                      styles.recordInnerCore,
                      { backgroundColor: colors.error },
                      isRecording && styles.recordStopCore,
                    ]}
                  />
                </View>
              </Pressable>
            </View>

            <Text style={[styles.recordHint, { color: colors.textSecondary }]}>
              {isRecording ? 'Tap to stop and review your voice note.' : 'Tap to start recording.'}
            </Text>
          </>
        )}
      </View>

      <View style={{ height: bottomInset }} />
    </>
  )
}

export function AudioRecorderModal({ visible, onDone, onCancel }: AudioRecorderModalProps) {
  const { colors, isDark } = useTheme()
  const styles = useThemedStyles(createStyles)
  const insets = useSafeAreaInsets()
  const { theme: md3Theme } = useMD3Theme()

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
  const timerColor = isRecording ? colors.error : colors.text
  const lineTrack = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)'
  const lineFill = isRecording ? colors.error : colors.primary
  const bottomInset = Math.max(insets.bottom, 8)
  const recordingCurrentSec = Math.floor(elapsed / 1000)
  const recordingWindowStartSec = Math.max(0, recordingCurrentSec - 2)
  const recordingMidSec = recordingCurrentSec
  const recordingEndSec = recordingCurrentSec + 2

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sheetProgress.value * 1,
  }))

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: (1 - sheetProgress.value) * 700,
      },
    ],
  }))

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    return () => {
      sheetProgress.value = 0
      onCancelRef.current?.()
    }
  }, [])

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
  }, [visible])

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
        Alert.alert('Microphone Access', 'Please enable microphone in Settings.')
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
      Alert.alert('Recording Error', err?.message ?? 'Could not start recording.')
    }
  }, [clearTimer, hasPermission, liveBars, recorder, stopPlayback])

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

  const handleDone = useCallback(async () => {
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

  const handleCancel = useCallback(async () => {
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
        title: 'Voice note captured',
        subtitle: 'Listen back, then save it into your note.',
      }
    }
    return {
      title: 'Capture the moment',
      subtitle: 'Tap the red button below to start or stop recording.',
    }
  }, [hasRecording])

  const sheetBg = isDark
    ? ((md3Theme.colors as any).surfaceContainerHighest ?? '#2C2C2E')
    : '#f2f2f7'

  if (!isPresented) return null

  return (
    <Modal
      visible={isPresented}
      transparent
      animationType="none"
      onShow={handleSheetShow}
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay} pointerEvents={visible ? 'box-none' : 'none'}>
        <Animated.View
          style={[styles.backdrop, backdropAnimatedStyle]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={handleCancel} />
        </Animated.View>

        <Animated.View
          style={[styles.sheetWrap, { paddingTop: insets.top + 18 }, sheetAnimatedStyle]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          <View style={[styles.sheet, { backgroundColor: sheetBg }]}>
            <SheetBody
              styles={styles}
              colors={colors}
              isDark={isDark}
              status={status}
              hasRecording={hasRecording}
              showRecordingSurface={showRecordingSurface}
              isRecording={isRecording}
              isPlaying={isPlaying}
              liveBars={liveBars}
              currentPlaybackMs={currentPlaybackMs}
              recordedDuration={recordedDuration}
              lineTrack={lineTrack}
              lineFill={lineFill}
              timerMs={timerMs}
              timerColor={timerColor}
              totalTimelineMs={totalTimelineMs}
              recordingWindowStartSec={recordingWindowStartSec}
              recordingMidSec={recordingMidSec}
              recordingEndSec={recordingEndSec}
              bottomInset={bottomInset}
              onCancel={handleCancel}
              onDone={handleDone}
              onRecord={handleRecord}
              onStop={handleStop}
              onPlayPause={handlePlayPause}
              onSkip={handleSkip}
              onSeekStart={handleSeekStart}
              onSeekChange={handleSeekChange}
              onSeekComplete={handleSeekComplete}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.38)',
    },
    sheetWrap: {
      flex: 1,
      justifyContent: 'flex-end',
      paddingHorizontal: 0,
    },
    sheet: {
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 4,
      gap: 14,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      boxShadow: theme.isDark ? '0 -10px 32px rgba(0,0,0,0.45)' : '0 -12px 40px rgba(0,0,0,0.22)',
    },
    grabber: {
      alignSelf: 'center',
      width: 38,
      height: 5,
      borderRadius: 999,
      backgroundColor: theme.isDark ? theme.colors.border : 'rgba(0,0,0,0.2)',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerActionPressed: {
      opacity: 0.48,
    },
    headerIconButton: {
      width: 36,
      height: 36,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.isDark ? theme.colors.controlBackground : 'rgba(0,0,0,0.08)',
      borderWidth: theme.isDark ? 0 : StyleSheet.hairlineWidth,
      borderColor: 'rgba(0,0,0,0.1)',
    },
    heroBlock: {
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      minHeight: 80,
      justifyContent: 'center',
    },
    heroTitle: {
      fontSize: 29,
      lineHeight: 34,
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: -0.7,
    },
    heroSubtitle: {
      fontSize: 15,
      lineHeight: 21,
      textAlign: 'center',
      maxWidth: 290,
    },
    timelineWrap: {
      gap: 6,
      paddingHorizontal: 6,
      minHeight: TIMELINE_H + 48,
    },
    timelineWrapPlayback: {
      minHeight: 84,
      gap: 8,
    },
    recordingWave: {
      height: TIMELINE_H + 28,
      position: 'relative',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    recordingBarsLane: {
      position: 'absolute',
      left: 0,
      width: '50%',
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'flex-end',
      overflow: 'hidden',
    },
    recordingBarsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: RECORDING_BAR_GAP,
      width: RECORDING_BARS * RECORDING_BAR_STEP,
      justifyContent: 'flex-end',
    },
    recordingNeedle: {
      position: 'absolute',
      top: 2,
      bottom: 2,
      left: '50%',
      width: 2,
      alignItems: 'center',
      marginLeft: -1,
    },
    recordingNeedleCap: {
      width: 12,
      height: 12,
      borderRadius: 999,
    },
    recordingNeedleStem: {
      flex: 1,
      width: 2,
      borderRadius: 999,
    },
    recordingRuler: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 6,
      paddingHorizontal: 2,
      minHeight: 22,
    },
    recordingTick: {
      fontSize: 11,
      fontVariant: ['tabular-nums'],
      minWidth: 36,
      textAlign: 'center',
      opacity: 0.78,
    },
    timelineOuter: {
      height: 54,
      gap: 8,
    },
    playbackTrackWrap: {
      height: 24,
      position: 'relative',
      justifyContent: 'center',
    },
    timelineTrack: {
      height: 2,
      borderRadius: 999,
      width: '100%',
    },
    playbackSlider: {
      position: 'absolute',
      left: -12,
      right: -12,
      height: 30,
      top: -3,
    },
    playbackTimeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    playbackSideTime: {
      fontSize: 11,
      fontVariant: ['tabular-nums'],
      minWidth: 40,
    },
    timerBlock: {
      alignItems: 'center',
      gap: 4,
      minHeight: 74,
      justifyContent: 'center',
    },
    timerLabel: {
      fontSize: 13,
      fontWeight: '600',
    },
    timer: {
      fontSize: 50,
      lineHeight: 56,
      fontWeight: '200',
      fontVariant: ['tabular-nums'],
      letterSpacing: -1.8,
    },
    controlsSection: {
      alignItems: 'center',
      gap: 12,
      paddingBottom: 0,
      minHeight: 142,
      justifyContent: 'center',
    },
    controlsSectionPlayback: {
      minHeight: 148,
    },
    transportRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 18,
    },
    secondaryTransport: {
      width: 54,
      height: 54,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.isDark ? theme.colors.controlBackground : 'rgba(0,0,0,0.07)',
      borderWidth: theme.isDark ? 0 : StyleSheet.hairlineWidth,
      borderColor: 'rgba(0,0,0,0.1)',
    },
    primaryTransport: {
      width: 78,
      height: 78,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: theme.isDark ? '0 10px 24px rgba(0,0,0,0.3)' : '0 10px 24px rgba(15,23,42,0.16)',
    },
    transportPressed: {
      opacity: 0.78,
      transform: [{ scale: 0.98 }],
    },
    rerecordButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)',
    },
    rerecordText: {
      fontSize: 15,
      fontWeight: '600',
    },
    recordStage: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 84,
    },
    recordButton: {
      padding: 10,
      borderRadius: 999,
    },
    recordButtonPressed: {
      opacity: 0.82,
      transform: [{ scale: 0.98 }],
    },
    recordOuterRing: {
      width: 88,
      height: 88,
      borderRadius: 999,
      borderWidth: 3,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.isDark ? 'rgba(255,69,58,0.08)' : 'rgba(255,69,58,0.06)',
    },
    recordInnerCore: {
      width: 64,
      height: 64,
      borderRadius: 999,
    },
    recordStopCore: {
      width: 28,
      height: 28,
      borderRadius: 8,
    },
    recordHint: {
      fontSize: 15,
      lineHeight: 20,
      textAlign: 'center',
    },
  })
