import Slider from '@react-native-community/slider'
import { SymbolView } from 'expo-symbols'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { GlassView } from '@/components/GlassView'
import { RecordingWaveBar } from '@/components/RecordingWaveBar'
import { Text, Theme, useTheme, createThemedStylesheet } from '@/components/Themed'
import {
  RECORDING_BARS,
  RECORDING_BAR_GAP,
  RECORDING_BAR_W,
  useAudioRecorderModal,
  fmtTimer,
  fmtShort,
} from '@/components/useAudioRecorderModal'
import {
  FontFamily,
  FontSize,
  FontWeight,
  Layout,
  Radii,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_24,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_18,
  UI_SIZE_24,
  UI_SIZE_28,
  UI_SIZE_36,
  UI_SIZE_54,
  UI_SIZE_64,
  UI_SIZE_80,
  UI_SIZE_88,
} from '@/constants/commonStyles'

const TIMELINE_H = 88
const RECORDING_BAR_STEP = RECORDING_BAR_W + RECORDING_BAR_GAP

interface AudioRecorderModalProps {
  visible: boolean
  onDone: (uri: string, durationMs: number) => void
  onCancel: () => void
}

interface SheetBodyProps {
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
  const { t } = useTranslation()
  const styles = useStyles()

  return (
    <>
      <View style={styles.grabber} />

      <View style={styles.headerRow}>
        <Pressable
          hitSlop={12}
          onPress={onCancel}
          style={({ pressed }) => [styles.headerIconButton, pressed && styles.headerActionPressed]}
        >
          <SymbolView
            name="xmark"
            size={UI_ICON_SIZE_16}
            tintColor={colors.textSecondary}
            weight="semibold"
          />
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
          <SymbolView
            name="checkmark"
            size={UI_ICON_SIZE_16}
            tintColor={!hasRecording && !isRecording ? colors.textMuted : colors.primary}
            weight="bold"
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
                  pressed && styles.transportPressed,
                ]}
              >
                <SymbolView
                  name="gobackward.15"
                  size={UI_ICON_SIZE_24}
                  tintColor={colors.text}
                  weight="regular"
                />
              </Pressable>

              <Pressable
                onPress={onPlayPause}
                style={({ pressed }) => [
                  styles.primaryTransport,
                  pressed && styles.transportPressed,
                ]}
              >
                <SymbolView
                  name={isPlaying ? 'pause.fill' : 'play.fill'}
                  size={UI_ICON_SIZE_24}
                  tintColor={isDark ? colors.black : colors.white}
                  weight="medium"
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
                <SymbolView
                  name="goforward.15"
                  size={UI_ICON_SIZE_24}
                  tintColor={colors.text}
                  weight="regular"
                />
              </Pressable>
            </View>

            <Pressable
              onPress={onRecord}
              style={({ pressed }) => [styles.rerecordButton, pressed && styles.transportPressed]}
            >
              <SymbolView
                name="arrow.clockwise"
                size={UI_ICON_SIZE_16}
                tintColor={colors.text}
                weight="semibold"
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
                  <View style={[styles.recordInnerCore, isRecording && styles.recordStopCore]} />
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
  const { colors, isDark } = useTheme()
  const styles = useStyles()
  const insets = useSafeAreaInsets()

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
          {isDark ? (
            <GlassView intensity={70} borderRadius={Radii.sheet} style={styles.sheet}>
              <SheetBody
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
            </GlassView>
          ) : (
            <View style={[styles.sheet, styles.sheetLight]}>
              <SheetBody
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
          )}
        </Animated.View>
      </View>
    </Modal>
  )
}

const useStyles = createThemedStylesheet((theme) => {
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
      paddingHorizontal: 0,
    },
    sheet: {
      paddingHorizontal: UI_SIZE_18,
      paddingTop: UI_SIZE_10,
      paddingBottom: UI_SIZE_4,
      gap: UI_SIZE_14,
      borderCurve: 'continuous',
      borderTopLeftRadius: Radii.sheet,
      borderTopRightRadius: Radii.sheet,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      boxShadow: theme.colors.sheetBoxShadow,
    },
    sheetLight: {
      backgroundColor: theme.colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.separator,
    },
    grabber: {
      alignSelf: 'center',
      width: Layout.grabberWidth,
      height: Layout.grabberHeight,
      borderRadius: 999,
      backgroundColor: theme.colors.sheetGrabber,
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
      width: UI_SIZE_36,
      height: UI_SIZE_36,
      borderRadius: 999,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.controlBackground,
      borderWidth: theme.isDark ? 0 : StyleSheet.hairlineWidth,
      borderColor: theme.colors.borderSecondary,
    },
    heroBlock: {
      alignItems: 'center',
      gap: UI_SIZE_6,
      paddingHorizontal: UI_SIZE_14,
      minHeight: UI_SIZE_80,
      justifyContent: 'center',
    },
    heroTitle: {
      fontSize: FontSize.heading,
      lineHeight: 34,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      textAlign: 'center',
      letterSpacing: -0.7,
      color: theme.colors.text,
    },
    heroSubtitle: {
      fontSize: FontSize.subtitle,
      lineHeight: 21,
      fontFamily: FontFamily.regular,
      textAlign: 'center',
      maxWidth: 290,
      color: theme.colors.textSecondary,
    },
    timelineWrap: {
      gap: UI_SIZE_6,
      paddingHorizontal: UI_SIZE_6,
      minHeight: TIMELINE_H + 48,
    },
    timelineWrapPlayback: {
      minHeight: 84,
      gap: UI_SIZE_8,
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
      width: UI_SIZE_12,
      height: UI_SIZE_12,
      borderRadius: 999,
      backgroundColor: theme.colors.error,
    },
    recordingNeedleCapInactive: {
      opacity: 0.56,
    },
    recordingNeedleStem: {
      flex: 1,
      width: 2,
      borderRadius: 999,
      backgroundColor: theme.colors.error,
    },
    recordingNeedleStemInactive: {
      opacity: 0.46,
    },
    recordingRuler: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: UI_SIZE_6,
      paddingHorizontal: UI_SIZE_2,
      minHeight: 22,
    },
    recordingTick: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.mono,
      opacity: 0.78,
      color: theme.colors.textMuted,
    },
    timelineOuter: {
      height: 54,
      gap: UI_SIZE_8,
    },
    playbackTrackWrap: {
      height: UI_SIZE_24,
      position: 'relative',
      justifyContent: 'center',
    },
    timelineTrack: {
      height: 2,
      borderRadius: 999,
      width: '100%',
      backgroundColor: theme.colors.separator,
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
      fontSize: FontSize.caption,
      fontFamily: FontFamily.mono,
      color: theme.colors.textMuted,
    },
    timerBlock: {
      alignItems: 'center',
      gap: UI_SIZE_4,
      minHeight: 74,
      justifyContent: 'center',
    },
    timerLabel: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: theme.colors.textSecondary,
    },
    timer: {
      fontSize: 50,
      lineHeight: 56,
      fontWeight: '200',
      fontFamily: FontFamily.mono,
      letterSpacing: -1.8,
      color: theme.colors.text,
    },
    timerRecording: {
      color: theme.colors.error,
    },
    controlsSection: {
      alignItems: 'center',
      gap: UI_SIZE_12,
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
      gap: UI_SIZE_18,
    },
    secondaryTransport: {
      width: UI_SIZE_54,
      height: UI_SIZE_54,
      borderRadius: 999,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.controlBackground,
      borderWidth: theme.isDark ? 0 : StyleSheet.hairlineWidth,
      borderColor: theme.colors.borderSecondary,
    },
    primaryTransport: {
      width: 78,
      height: 78,
      borderRadius: 999,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.text,
      boxShadow: theme.colors.transportShadow,
    },
    transportPressed: {
      opacity: 0.78,
      transform: [{ scale: 0.98 }],
    },
    rerecordButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_8,
      paddingHorizontal: UI_SIZE_18,
      paddingVertical: UI_SIZE_12,
      borderRadius: 999,
      borderCurve: 'continuous',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.rerecordBorder,
      backgroundColor: theme.isDark
        ? theme.colors.surfaceSecondary
        : theme.colors.sheetCancelBackground,
    },
    rerecordText: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    recordStage: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 84,
    },
    recordButton: {
      padding: UI_SIZE_10,
      borderRadius: 999,
      borderCurve: 'continuous',
    },
    recordButtonPressed: {
      opacity: 0.82,
      transform: [{ scale: 0.98 }],
    },
    recordOuterRing: {
      width: UI_SIZE_88,
      height: UI_SIZE_88,
      borderRadius: 999,
      borderWidth: 3,
      alignItems: 'center',
      justifyContent: 'center',
      borderCurve: 'continuous',
      borderColor: theme.colors.error,
      backgroundColor: theme.colors.recordRingBg,
    },
    recordInnerCore: {
      width: UI_SIZE_64,
      height: UI_SIZE_64,
      borderRadius: 999,
      borderCurve: 'continuous',
      backgroundColor: theme.colors.error,
    },
    recordStopCore: {
      width: UI_SIZE_28,
      height: UI_SIZE_28,
      borderRadius: 8,
    },
    recordHint: {
      fontSize: FontSize.subtitle,
      lineHeight: 20,
      textAlign: 'center',
      fontFamily: FontFamily.regular,
      color: theme.colors.textSecondary,
    },
  })
  return styles
})
