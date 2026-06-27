import Slider from '@react-native-community/slider'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { RecordingWaveBar } from '@/components/RecordingWaveBar'
import { createThemedStylesheetWithHooks, Text, Theme, useTheme } from '@/components/Themed'
import {
  RECORDING_BARS,
  RECORDING_BAR_GAP,
  useAudioRecorderModal,
  fmtTimer,
  fmtShort,
} from '@/components/useAudioRecorderModal'
import {
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_24,
  UI_ICON_SIZE_28,
  UI_ICON_SIZE_36,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_16,
  UI_SIZE_18,
  UI_SIZE_2,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_28,
  UI_SIZE_32,
  UI_SIZE_36,
  UI_SIZE_4,
  UI_SIZE_40,
  UI_SIZE_48,
  UI_SIZE_8,
} from '@/constants/commonStyles'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerLow: string
  surfaceContainer: string
  surfaceContainerHigh: string
  surfaceContainerHighest: string
  surfaceContainerLowest: string
}

const TIMELINE_H = 88

interface AudioRecorderModalProps {
  visible: boolean
  onDone: (uri: string, durationMs: number) => void
  onCancel: () => void
}

interface SheetBodyProps {
  colors: Theme['colors']
  md3Theme: ReturnType<typeof useMD3Theme>
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
  colors,
  md3Theme,
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
  const { t } = useTranslation()
  const styles = useStyles()

  return (
    <>
      <View style={styles.grabber} />

      <View style={styles.headerRow}>
        <Pressable
          hitSlop={12}
          onPress={onCancel}
          style={({ pressed }) => [
            styles.headerIconButton,
            pressed && styles.headerIconButtonPressed,
          ]}
        >
          <MaterialCommunityIcons
            name="close"
            size={UI_ICON_SIZE_24}
            color={(md3Theme.colors as any).onSurfaceVariant ?? colors.textSecondary}
          />
        </Pressable>

        <Pressable
          disabled={!hasRecording && !isRecording}
          hitSlop={12}
          onPress={onDone}
          style={({ pressed }) => [
            styles.headerIconButton,
            (!hasRecording && !isRecording) || pressed ? styles.headerIconButtonDisabled : null,
          ]}
        >
          <MaterialCommunityIcons
            name="check"
            size={UI_ICON_SIZE_24}
            color={
              !hasRecording && !isRecording
                ? ((md3Theme.colors as any).onSurfaceVariant ?? colors.textMuted)
                : md3Theme.colors.primary
            }
          />
        </Pressable>
      </View>

      <View style={styles.heroBlock}>
        <Text style={styles.heroTitle}>{status.title}</Text>
        <Text style={styles.heroSubtitle}>{status.subtitle}</Text>
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
                  !isRecording && styles.recordingNeedleCapInactive,
                ]}
              />
              <View
                style={[
                  styles.recordingNeedleStem,
                  !isRecording && styles.recordingNeedleStemInactive,
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
              <Text style={styles.playbackSideTime}>{fmtShort(currentPlaybackMs / 1000)}</Text>
              <Text style={styles.playbackSideTime}>{fmtShort(totalTimelineMs / 1000)}</Text>
            </View>
          </View>
        )}

        {showRecordingSurface && (
          <View style={styles.recordingRuler}>
            <Text style={styles.recordingTick}>
              {fmtShort(isRecording ? recordingWindowStartSec : 0)}
            </Text>
            <Text style={styles.recordingTick}>{fmtShort(isRecording ? recordingMidSec : 0)}</Text>
            <Text style={styles.recordingTick}>{fmtShort(isRecording ? recordingEndSec : 2)}</Text>
          </View>
        )}
      </View>

      <View style={styles.timerBlock}>
        <Text style={styles.timerLabel}>
          {hasRecording
            ? t('audioRecorder.timer.playbackPosition')
            : t('audioRecorder.timer.recordingTime')}
        </Text>
        <Text style={[styles.timer, { color: timerColor }, isRecording && styles.timerRecording]}>
          {fmtTimer(timerMs)}
        </Text>
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
                  pressed && styles.secondaryTransportPressed,
                ]}
              >
                <MaterialCommunityIcons
                  name="rewind-15"
                  size={UI_ICON_SIZE_28}
                  color={(md3Theme.colors as any).onSurfaceVariant ?? colors.text}
                />
              </Pressable>

              <Pressable
                onPress={onPlayPause}
                style={({ pressed }) => [
                  styles.primaryTransport,
                  pressed && styles.primaryTransportPressed,
                ]}
              >
                <MaterialCommunityIcons
                  name={isPlaying ? 'pause' : 'play'}
                  size={UI_ICON_SIZE_36}
                  color={md3Theme.colors.onPrimaryContainer}
                />
              </Pressable>

              <Pressable
                hitSlop={12}
                onPress={() => onSkip(15)}
                style={({ pressed }) => [
                  styles.secondaryTransport,
                  pressed && styles.secondaryTransportPressed,
                ]}
              >
                <MaterialCommunityIcons
                  name="fast-forward-15"
                  size={UI_ICON_SIZE_28}
                  color={(md3Theme.colors as any).onSurfaceVariant ?? colors.text}
                />
              </Pressable>
            </View>

            <Pressable
              onPress={onRecord}
              style={({ pressed }) => [
                styles.rerecordButton,
                pressed && styles.rerecordButtonPressed,
              ]}
            >
              <MaterialCommunityIcons
                name="refresh"
                size={UI_ICON_SIZE_20}
                color={md3Theme.colors.onSecondaryContainer}
              />
              <Text style={styles.rerecordText}>{t('audioRecorder.actions.reRecord')}</Text>
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
                <View style={styles.recordOuterRing}>
                  <Animated.View
                    style={[styles.recordMd3Core, isRecording && styles.recordMd3CoreRecording]}
                  />
                </View>
              </Pressable>
            </View>

            <Text style={styles.recordHint}>
              {isRecording
                ? t('audioRecorder.actions.stopHint')
                : t('audioRecorder.actions.startHint')}
            </Text>
          </>
        )}
      </View>

      <View style={{ height: bottomInset }} />
    </>
  )
}

export function AudioRecorderModal({ visible, onDone, onCancel }: AudioRecorderModalProps) {
  const { colors } = useTheme()
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const md3Theme = useMD3Theme()

  const {
    isRecording,
    isPlaying,
    hasRecording,
    showRecordingSurface,
    currentPlaybackMs,
    timerMs,
    totalTimelineMs,
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
  } = useAudioRecorderModal({ visible, onDone, onCancel })

  const timerColor = isRecording ? colors.error : colors.text
  const lineTrack = colors.timelineTrack
  const lineFill = isRecording ? colors.error : colors.primary
  const bottomInset = Math.max(insets.bottom, 8)

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

  if (!isPresented) return null

  return (
    <Modal
      visible={isPresented}
      transparent
      animationType="none"
      onShow={handleSheetShow}
      onRequestClose={handleCancelInner}
    >
      <View style={styles.overlay} pointerEvents={visible ? 'box-none' : 'none'}>
        <Animated.View
          style={[styles.backdrop, backdropAnimatedStyle]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCancelInner} />
        </Animated.View>

        <Animated.View
          style={[styles.sheetWrap, { paddingTop: insets.top + UI_SIZE_18 }, sheetAnimatedStyle]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          <View style={styles.sheet}>
            <SheetBody
              colors={colors}
              md3Theme={md3Theme}
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
              onCancel={handleCancelInner}
              onDone={handleDoneInner}
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

const useStyles = createThemedStylesheetWithHooks((theme, md3Theme) => {
  const c = md3Theme.colors as ExtendedColors
  const sheetBg = theme.isDark
    ? (c.surfaceContainerHighest ?? theme.colors.sheetBackground)
    : theme.colors.sheetBackground

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.backdrop,
    },
    sheetWrap: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      borderTopLeftRadius: UI_SIZE_28,
      borderTopRightRadius: UI_SIZE_28,
      paddingHorizontal: UI_SIZE_28,
      paddingTop: UI_SIZE_12,
      shadowColor: theme.colors.black,
      shadowOffset: { width: 0, height: -12 },
      shadowOpacity: 0.15,
      shadowRadius: UI_SIZE_28,
      elevation: 24,
      backgroundColor: sheetBg,
    },
    grabber: {
      width: UI_SIZE_32,
      height: UI_SIZE_4,
      borderRadius: 9999,
      alignSelf: 'center',
      marginBottom: UI_SIZE_20,
      marginTop: UI_SIZE_4,
      backgroundColor: (md3Theme.colors as any).onSurfaceVariant ?? theme.colors.text,
      opacity: 0.4,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: UI_SIZE_20,
    },
    headerIconButton: {
      width: UI_SIZE_48,
      height: UI_SIZE_48,
      borderRadius: UI_SIZE_24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerIconButtonPressed: {
      opacity: 0.6,
    },
    headerIconButtonDisabled: {
      opacity: 0.5,
    },
    heroBlock: {
      alignItems: 'center',
      marginBottom: UI_SIZE_24,
    },
    heroTitle: {
      fontSize: FontSize.heading,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      textAlign: 'center',
      marginBottom: UI_SIZE_8,
      letterSpacing: -0.3,
      color: theme.colors.text,
    },
    heroSubtitle: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      fontWeight: FontWeight.regular,
      textAlign: 'center',
      lineHeight: UI_SIZE_20,
      paddingHorizontal: UI_SIZE_12,
      color: theme.colors.textSecondary,
    },
    timelineWrap: {
      height: TIMELINE_H,
      marginBottom: UI_SIZE_32,
      justifyContent: 'center',
    },
    timelineWrapPlayback: {
      height: 72,
    },
    recordingWave: {
      height: 84,
      justifyContent: 'center',
      position: 'relative',
    },
    recordingBarsLane: {
      height: 84,
      overflow: 'hidden',
    },
    recordingBarsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      height: '100%',
      gap: RECORDING_BAR_GAP,
    },
    recordingNeedle: {
      position: 'absolute',
      right: 0,
      top: -4,
      bottom: -4,
      width: UI_SIZE_2,
      alignItems: 'center',
    },
    recordingNeedleCap: {
      width: UI_SIZE_8,
      height: UI_SIZE_8,
      borderRadius: UI_SIZE_4,
      marginBottom: -1,
      backgroundColor: theme.colors.error,
    },
    recordingNeedleCapInactive: {
      opacity: 0.56,
    },
    recordingNeedleStem: {
      flex: 1,
      width: UI_SIZE_2,
      borderRadius: 1,
      backgroundColor: theme.colors.error,
    },
    recordingNeedleStemInactive: {
      opacity: 0.46,
    },
    recordingRuler: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: UI_SIZE_10,
      paddingHorizontal: UI_SIZE_2,
    },
    recordingTick: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.mono,
      color: theme.colors.textMuted,
    },
    timelineOuter: {
      width: '100%',
    },
    playbackTrackWrap: {
      width: '100%',
      height: UI_SIZE_32,
      justifyContent: 'center',
    },
    timelineTrack: {
      position: 'absolute',
      left: UI_SIZE_14,
      right: UI_SIZE_14,
      height: UI_SIZE_4,
      borderRadius: UI_SIZE_2,
    },
    playbackSlider: {
      width: '100%',
      height: UI_SIZE_32,
    },
    playbackTimeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    playbackSideTime: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.mono,
      color: theme.colors.textMuted,
    },
    timerBlock: {
      alignItems: 'center',
      marginBottom: UI_SIZE_40,
    },
    timerLabel: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginBottom: UI_SIZE_8,
      opacity: 0.7,
      color: theme.colors.textSecondary,
    },
    timer: {
      fontSize: 54,
      lineHeight: 64,
      fontWeight: '300',
      fontFamily: FontFamily.mono,
      letterSpacing: -1,
      includeFontPadding: false,
    },
    timerRecording: {
      color: theme.colors.error,
    },
    controlsSection: {
      alignItems: 'center',
      paddingBottom: UI_SIZE_24,
    },
    controlsSectionPlayback: {
      paddingBottom: UI_SIZE_20,
    },
    recordStage: {
      marginBottom: UI_SIZE_24,
    },
    recordButton: {
      width: 88,
      height: 88,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recordButtonPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.94 }],
    },
    recordOuterRing: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: (md3Theme.colors as any).errorContainer ?? theme.colors.error,
    },
    recordMd3Core: {
      width: UI_SIZE_32,
      height: UI_SIZE_32,
      borderRadius: UI_SIZE_16,
      backgroundColor: md3Theme.colors.onErrorContainer ?? theme.colors.background,
    },
    recordMd3CoreRecording: {
      transform: [{ scale: 0.6 }],
      borderRadius: UI_SIZE_8,
    },
    recordHint: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.medium,
      fontWeight: FontWeight.medium,
      opacity: 0.8,
      color: theme.colors.textSecondary,
    },
    transportRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_36,
      marginBottom: UI_SIZE_32,
    },
    primaryTransport: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: md3Theme.colors.primaryContainer,
    },
    primaryTransportPressed: {
      opacity: 0.8,
    },
    secondaryTransport: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryTransportPressed: {
      opacity: 0.6,
    },
    rerecordButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: UI_SIZE_24,
      paddingVertical: UI_SIZE_14,
      borderRadius: UI_SIZE_16,
      gap: UI_SIZE_8,
      backgroundColor: md3Theme.colors.secondaryContainer,
    },
    rerecordButtonPressed: {
      opacity: 0.7,
    },
    rerecordText: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: md3Theme.colors.onSecondaryContainer,
    },
  })
  return styles
}, useMD3Theme)
