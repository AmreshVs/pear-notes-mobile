import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SymbolView } from 'expo-symbols'

import { GlassView } from '@/components/GlassView'
import { RecordingWaveBar } from '@/components/RecordingWaveBar'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  fmtTimer,
  RECORDING_BAR_GAP,
  RECORDING_BAR_W,
  RECORDING_BARS,
} from '@/components/useAudioRecorderModal'
import {
  useVoiceTypingSheet,
  type VoiceTypingError,
  type VoiceTypingMode,
  type VoiceTypingPhase,
} from '@/components/useVoiceTypingSheet'
import {
  FontFamily,
  FontSize,
  FontWeight,
  Layout,
  Radii,
  UI_ICON_SIZE_16,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_18,
  UI_SIZE_28,
  UI_SIZE_36,
  UI_SIZE_54,
  UI_SIZE_64,
  UI_SIZE_80,
  UI_SIZE_88,
} from '@/constants/commonStyles'

const RECORDING_BAR_STEP = RECORDING_BAR_W + RECORDING_BAR_GAP

interface VoiceTypingSheetProps {
  visible: boolean
  mode: VoiceTypingMode
  sourceUri: string | null
  insertBlocked: boolean
  onInsert: (text: string) => void
  onClose: () => void
}

function heroKeys(mode: VoiceTypingMode, phase: VoiceTypingPhase, error: VoiceTypingError | null) {
  const base = mode === 'dictate' ? 'localAi.voiceTyping' : 'localAi.transcribe'
  if (phase === 'error')
    return { title: `localAi.errors.${error}.title`, subtitle: `localAi.errors.${error}.subtitle` }
  return { title: `${base}.${phase}.title`, subtitle: `${base}.${phase}.subtitle` }
}

export function VoiceTypingSheet({
  visible,
  mode,
  sourceUri,
  insertBlocked,
  onInsert,
  onClose,
}: VoiceTypingSheetProps) {
  const { t } = useTranslation()
  const { colors, isDark } = useTheme()
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const {
    phase,
    elapsed,
    text,
    error,
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
  } = useVoiceTypingSheet({ visible, mode, sourceUri, onInsert, onClose })

  const backdropAnimatedStyle = useAnimatedStyle(() => ({ opacity: sheetProgress.value }))
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - sheetProgress.value) * 700 }],
  }))

  if (!isPresented) return null

  const keys = heroKeys(mode, phase, error)
  const canInsert = phase === 'preview' && !insertBlocked
  const isRecording = phase === 'recording'
  const showRecorder = mode === 'dictate' && (phase === 'idle' || phase === 'recording')

  const body = (
    <>
      <View style={styles.grabber} />

      <View style={styles.headerRow}>
        <Pressable
          hitSlop={12}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
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
          disabled={!canInsert}
          hitSlop={12}
          onPress={handleInsert}
          accessibilityRole="button"
          accessibilityLabel={t('localAi.actions.insert')}
          style={({ pressed }) => [
            styles.headerIconButton,
            (!canInsert || pressed) && styles.headerActionPressed,
          ]}
        >
          <SymbolView
            name="checkmark"
            size={UI_ICON_SIZE_16}
            tintColor={canInsert ? colors.primary : colors.textMuted}
            weight="bold"
          />
        </Pressable>
      </View>

      <View style={styles.heroBlock}>
        <Text style={styles.heroTitle}>{t(keys.title)}</Text>
        <Text style={styles.heroSubtitle}>
          {phase === 'preview' && insertBlocked ? t('localAi.conflictBlocked') : t(keys.subtitle)}
        </Text>
      </View>

      {showRecorder && (
        <>
          <View style={styles.recordingWave}>
            <View style={styles.recordingBarsLane}>
              <View style={styles.recordingBarsRow}>
                {Array.from({ length: RECORDING_BARS }, (_, index) => (
                  <RecordingWaveBar
                    key={index}
                    active={isRecording}
                    index={index}
                    values={liveBars}
                    color={colors.primary}
                  />
                ))}
              </View>
            </View>
          </View>

          <Text style={[styles.timer, isRecording && styles.timerRecording]}>
            {fmtTimer(elapsed)}
          </Text>

          <View style={styles.controlsSection}>
            <Pressable
              onPress={isRecording ? handleStop : handleRecord}
              accessibilityRole="button"
              accessibilityLabel={
                isRecording ? t('localAi.actions.stop') : t('localAi.actions.start')
              }
              style={({ pressed }) => [styles.recordButton, pressed && styles.recordButtonPressed]}
            >
              <View style={styles.recordOuterRing}>
                <View style={[styles.recordInnerCore, isRecording && styles.recordStopCore]} />
              </View>
            </Pressable>
            <Text style={styles.recordHint}>
              {isRecording ? t('localAi.voiceTyping.stopHint') : t('localAi.voiceTyping.startHint')}
            </Text>
          </View>
        </>
      )}

      {phase === 'transcribing' && (
        <View style={styles.statusBlock}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {phase === 'preview' && (
        <ScrollView style={styles.previewCard} contentContainerStyle={styles.previewContent}>
          <Text style={styles.previewText} selectable>
            {text}
          </Text>
        </ScrollView>
      )}

      {(phase === 'preview' || phase === 'error') && (
        <View style={styles.actionsRow}>
          {phase === 'error' && error === 'micDenied' ? (
            <Pressable
              onPress={handleOpenSettings}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.primaryButtonText}>{t('localAi.actions.openSettings')}</Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={handleAgain}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
              >
                <SymbolView
                  name="arrow.clockwise"
                  size={UI_ICON_SIZE_16}
                  tintColor={colors.text}
                  weight="semibold"
                />
                <Text style={styles.secondaryButtonText}>
                  {t(
                    mode === 'dictate' && phase === 'preview'
                      ? 'localAi.actions.recordAgain'
                      : 'localAi.actions.again',
                  )}
                </Text>
              </Pressable>
              {phase === 'preview' && (
                <Pressable
                  disabled={!canInsert}
                  onPress={handleInsert}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    !canInsert && styles.buttonDisabled,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>{t('localAi.actions.insert')}</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      )}

      <View style={{ height: Math.max(insets.bottom, 8) }} />
    </>
  )

  return (
    <Modal
      visible={isPresented}
      transparent
      animationType="none"
      onShow={handleSheetShow}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay} pointerEvents={visible ? 'box-none' : 'none'}>
        <Animated.View
          style={[styles.backdrop, backdropAnimatedStyle]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>
        <Animated.View
          style={[styles.sheetWrap, { paddingTop: insets.top + UI_SIZE_18 }, sheetAnimatedStyle]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          {isDark ? (
            <GlassView intensity={70} borderRadius={Radii.sheet} style={styles.sheet}>
              {body}
            </GlassView>
          ) : (
            <View style={[styles.sheet, styles.sheetLight]}>{body}</View>
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
    },
    sheet: {
      paddingHorizontal: UI_SIZE_18,
      paddingTop: UI_SIZE_10,
      paddingBottom: UI_SIZE_4,
      gap: UI_SIZE_14,
      borderCurve: 'continuous',
      borderTopLeftRadius: Radii.sheet,
      borderTopRightRadius: Radii.sheet,
      boxShadow: theme.colors.sheetBoxShadow,
    },
    sheetLight: {
      borderTopWidth: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.background,
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
      maxWidth: 300,
      color: theme.colors.textSecondary,
    },
    recordingWave: {
      height: UI_SIZE_88,
      justifyContent: 'center',
      overflow: 'hidden',
    },
    recordingBarsLane: {
      alignItems: 'center',
      overflow: 'hidden',
    },
    recordingBarsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: RECORDING_BAR_GAP,
      width: RECORDING_BARS * RECORDING_BAR_STEP,
      justifyContent: 'flex-end',
    },
    timer: {
      fontSize: 40,
      lineHeight: 46,
      fontWeight: '200',
      fontFamily: FontFamily.mono,
      textAlign: 'center',
      color: theme.colors.text,
    },
    timerRecording: {
      color: theme.colors.primary,
    },
    controlsSection: {
      alignItems: 'center',
      gap: UI_SIZE_12,
      minHeight: 142,
      justifyContent: 'center',
    },
    recordButton: {
      padding: UI_SIZE_10,
      borderRadius: 999,
    },
    recordButtonPressed: {
      opacity: 0.82,
      transform: [{ scale: 0.98 }],
    },
    recordOuterRing: {
      width: UI_SIZE_88,
      height: UI_SIZE_88,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}14`,
    },
    recordInnerCore: {
      width: UI_SIZE_64,
      height: UI_SIZE_64,
      borderRadius: 999,
      backgroundColor: theme.colors.primary,
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
    statusBlock: {
      minHeight: 160,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewCard: {
      maxHeight: 240,
      borderRadius: Radii.card,
      backgroundColor: theme.colors.cardSurface,
    },
    previewContent: {
      padding: UI_SIZE_14,
    },
    previewText: {
      fontSize: FontSize.subtitle,
      lineHeight: 24,
      fontFamily: FontFamily.regular,
      color: theme.colors.text,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: UI_SIZE_12,
      paddingTop: UI_SIZE_4,
    },
    secondaryButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: UI_SIZE_8,
      minHeight: UI_SIZE_54,
      borderRadius: 999,
      borderCurve: 'continuous',
      backgroundColor: theme.isDark
        ? theme.colors.surfaceSecondary
        : theme.colors.sheetCancelBackground,
    },
    secondaryButtonText: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    primaryButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: UI_SIZE_54,
      borderRadius: 999,
      borderCurve: 'continuous',
      backgroundColor: theme.colors.primary,
    },
    primaryButtonText: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.onPrimary,
    },
    buttonDisabled: {
      opacity: 0.4,
    },
    buttonPressed: {
      opacity: 0.78,
      transform: [{ scale: 0.98 }],
    },
  })
  return styles
})
