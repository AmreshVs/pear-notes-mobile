import { useTranslation } from 'react-i18next'
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SymbolView } from 'expo-symbols'

import { GlassView } from '@/components/GlassView'
import { LocalAiProcessing } from '@/components/LocalAiProcessing'
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
  UI_ICON_SIZE_20,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_18,
  UI_SIZE_32,
  UI_SIZE_40,
  UI_SIZE_54,
  UI_SIZE_64,
} from '@/constants/commonStyles'

const RECORDING_BAR_STEP = RECORDING_BAR_W + RECORDING_BAR_GAP
const PREVIEW_MAX_HEIGHT_RATIO = 0.42

interface VoiceTypingSheetProps {
  visible: boolean
  mode: VoiceTypingMode
  sourceUri: string | null
  insertBlocked: boolean
  onInsert: (text: string) => void
  onClose: () => void
}

const HERO_BASE_BY_MODE: Record<VoiceTypingMode, string> = {
  dictate: 'localAi.voiceTyping',
  transcribe: 'localAi.transcribe',
  extract: 'localAi.extractText',
}

const ICON_BY_MODE: Record<VoiceTypingMode, string> = {
  dictate: 'waveform',
  transcribe: 'text.quote',
  extract: 'text.viewfinder',
}

function heroKeys(mode: VoiceTypingMode, phase: VoiceTypingPhase, error: VoiceTypingError | null) {
  const base = HERO_BASE_BY_MODE[mode]
  if (phase === 'error') {
    const errorKey =
      mode === 'extract' && error === 'empty'
        ? 'emptyImage'
        : mode === 'extract' && error === 'failed'
          ? 'failedExtract'
          : error
    return {
      title: `localAi.errors.${errorKey}.title`,
      subtitle: `localAi.errors.${errorKey}.subtitle`,
    }
  }
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
  const { height: windowHeight } = useWindowDimensions()
  const {
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
  } = useVoiceTypingSheet({ visible, mode, sourceUri, onInsert, onClose })

  const backdropAnimatedStyle = useAnimatedStyle(() => ({ opacity: sheetProgress.value }))
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - sheetProgress.value) * 700 }],
  }))

  if (!isPresented) return null

  const keys = heroKeys(mode, phase, error)
  const canInsert = phase === 'preview' && !insertBlocked
  const isRecording = phase === 'recording'
  const isError = phase === 'error'
  const showRecorder = mode === 'dictate' && (phase === 'idle' || phase === 'recording')
  const showProcessing = phase === 'transcribing' || (phase === 'idle' && mode !== 'dictate')
  const subtitle =
    phase === 'preview' && insertBlocked ? t('localAi.conflictBlocked') : t(keys.subtitle)

  const body = (
    <>
      <View style={styles.grabber} />

      <View style={styles.header}>
        <View style={[styles.badge, isError && styles.badgeError]}>
          <SymbolView
            name={(isError ? 'exclamationmark.triangle' : ICON_BY_MODE[mode]) as never}
            size={UI_ICON_SIZE_20}
            tintColor={isError ? colors.error : colors.primary}
            weight="semibold"
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t(keys.title)}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <Pressable
          hitSlop={12}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
        >
          <SymbolView
            name="xmark"
            size={UI_ICON_SIZE_16}
            tintColor={colors.textSecondary}
            weight="semibold"
          />
        </Pressable>
      </View>

      {showRecorder && (
        <View style={styles.recorder}>
          <View style={styles.waveLane}>
            <View style={styles.waveRow}>
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
          <View style={styles.recorderFooter}>
            <Text style={[styles.timer, isRecording && styles.timerRecording]}>
              {fmtTimer(elapsed)}
            </Text>
            <Pressable
              onPress={isRecording ? handleStop : handleRecord}
              accessibilityRole="button"
              accessibilityLabel={
                isRecording ? t('localAi.actions.stop') : t('localAi.actions.start')
              }
              accessibilityHint={
                isRecording ? t('localAi.voiceTyping.stopHint') : t('localAi.voiceTyping.startHint')
              }
              style={({ pressed }) => [styles.recordButton, pressed && styles.pressed]}
            >
              <View style={[styles.recordCore, isRecording && styles.recordStopCore]} />
            </Pressable>
          </View>
        </View>
      )}

      {showProcessing && (
        <LocalAiProcessing
          color={colors.primary}
          captionColor={colors.textSecondary}
          caption={pageProgress ? t('localAi.extractText.pageProgress', pageProgress) : null}
        />
      )}

      {phase === 'preview' && (
        <ScrollView
          style={[styles.previewCard, { maxHeight: windowHeight * PREVIEW_MAX_HEIGHT_RATIO }]}
          contentContainerStyle={styles.previewContent}
        >
          <Text style={styles.previewText} selectable>
            {text}
          </Text>
        </ScrollView>
      )}

      {(phase === 'preview' || isError) && (
        <View style={styles.actionsRow}>
          {isError && error === 'micDenied' ? (
            <Pressable
              onPress={handleOpenSettings}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.primaryButtonText}>{t('localAi.actions.openSettings')}</Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={handleAgain}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
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
                  onPress={handleCopy}
                  accessibilityRole="button"
                  accessibilityLabel={
                    copied ? t('localAi.actions.copied') : t('localAi.actions.copy')
                  }
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                >
                  <SymbolView
                    name={copied ? 'checkmark' : 'doc.on.doc'}
                    size={UI_ICON_SIZE_20}
                    tintColor={copied ? colors.primary : colors.text}
                    weight="semibold"
                  />
                </Pressable>
              )}
              {phase === 'preview' && (
                <Pressable
                  disabled={!canInsert}
                  onPress={handleInsert}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    !canInsert && styles.buttonDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>{t('localAi.actions.insert')}</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      )}

      <View style={{ height: Math.max(insets.bottom, UI_SIZE_12) }} />
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
      gap: UI_SIZE_18,
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
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: UI_SIZE_12,
    },
    badge: {
      width: UI_SIZE_40,
      height: UI_SIZE_40,
      borderRadius: UI_SIZE_12,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${theme.colors.primary}1F`,
    },
    badgeError: {
      backgroundColor: `${theme.colors.error}1F`,
    },
    headerText: {
      flex: 1,
      gap: UI_SIZE_2,
    },
    title: {
      fontSize: FontSize.title,
      lineHeight: 26,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      letterSpacing: -0.4,
      paddingRight: UI_SIZE_2,
      color: theme.colors.text,
    },
    subtitle: {
      fontSize: FontSize.body,
      lineHeight: 20,
      fontFamily: FontFamily.regular,
      color: theme.colors.textSecondary,
    },
    closeButton: {
      width: UI_SIZE_32,
      height: UI_SIZE_32,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.controlBackground,
    },
    pressed: {
      opacity: 0.6,
    },
    recorder: {
      gap: UI_SIZE_8,
    },
    waveLane: {
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    waveRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: RECORDING_BAR_GAP,
      width: RECORDING_BARS * RECORDING_BAR_STEP,
    },
    recorderFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    timer: {
      fontSize: 30,
      lineHeight: 36,
      fontWeight: '300',
      fontFamily: FontFamily.mono,
      color: theme.colors.text,
    },
    timerRecording: {
      color: theme.colors.primary,
    },
    recordButton: {
      width: UI_SIZE_64,
      height: UI_SIZE_64,
      borderRadius: 999,
      borderWidth: 3,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: theme.colors.primary,
    },
    recordCore: {
      width: 48,
      height: 48,
      borderRadius: 999,
      backgroundColor: theme.colors.primary,
    },
    recordStopCore: {
      width: 22,
      height: 22,
      borderRadius: 6,
    },
    previewCard: {
      borderRadius: Radii.card,
      borderCurve: 'continuous',
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
    iconButton: {
      width: UI_SIZE_54,
      height: UI_SIZE_54,
      borderRadius: 999,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.isDark
        ? theme.colors.surfaceSecondary
        : theme.colors.sheetCancelBackground,
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
  })
  return styles
})
