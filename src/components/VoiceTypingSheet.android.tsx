import { useTranslation } from 'react-i18next'
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { LocalAiProcessing } from '@/components/LocalAiProcessing'
import { RecordingWaveBar } from '@/components/RecordingWaveBar'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import { fmtTimer, RECORDING_BAR_GAP, RECORDING_BARS } from '@/components/useAudioRecorderModal'
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
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_24,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_16,
  UI_SIZE_18,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_28,
  UI_SIZE_32,
  UI_SIZE_40,
  UI_SIZE_54,
  UI_SIZE_64,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

const PREVIEW_MAX_HEIGHT_RATIO = 0.42

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  surfaceContainerHighest?: string
  onSurfaceVariant?: string
}

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
  transcribe: 'text-box-outline',
  extract: 'text-recognition',
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
  const { colors } = useTheme()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
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
  const mutedColor = c.onSurfaceVariant ?? colors.textSecondary

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
          <View style={styles.sheet}>
            <View style={styles.grabber} />

            <View style={styles.header}>
              <View style={[styles.badge, isError && styles.badgeError]}>
                <MaterialCommunityIcons
                  name={(isError ? 'alert-circle-outline' : ICON_BY_MODE[mode]) as never}
                  size={UI_ICON_SIZE_20}
                  color={isError ? c.error : c.primary}
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
                <MaterialCommunityIcons name="close" size={UI_ICON_SIZE_24} color={mutedColor} />
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
                        color={c.primary}
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
                      isRecording
                        ? t('localAi.voiceTyping.stopHint')
                        : t('localAi.voiceTyping.startHint')
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
                color={c.primary}
                captionColor={mutedColor}
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
                    <Text style={styles.primaryButtonText}>
                      {t('localAi.actions.openSettings')}
                    </Text>
                  </Pressable>
                ) : (
                  <>
                    <Pressable
                      onPress={handleAgain}
                      style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                    >
                      <MaterialCommunityIcons
                        name="refresh"
                        size={UI_ICON_SIZE_20}
                        color={md3.colors.onSecondaryContainer}
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
                        <MaterialCommunityIcons
                          name={copied ? 'check' : 'content-copy'}
                          size={UI_ICON_SIZE_20}
                          color={copied ? md3.colors.primary : md3.colors.onSecondaryContainer}
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
      paddingHorizontal: UI_SIZE_20,
      paddingTop: UI_SIZE_12,
      gap: UI_SIZE_18,
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
      marginTop: UI_SIZE_4,
      backgroundColor: c.onSurfaceVariant ?? theme.colors.text,
      opacity: 0.4,
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
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: hexWithAlpha(md3Theme.colors.primary, 0.14),
    },
    badgeError: {
      backgroundColor: hexWithAlpha(md3Theme.colors.error, 0.14),
    },
    headerText: {
      flex: 1,
      gap: UI_SIZE_2,
    },
    title: {
      fontSize: FontSize.title,
      lineHeight: 26,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onSurface,
    },
    subtitle: {
      fontSize: FontSize.body,
      lineHeight: 20,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant ?? theme.colors.textSecondary,
    },
    closeButton: {
      width: UI_SIZE_40,
      height: UI_SIZE_40,
      marginTop: -UI_SIZE_4,
      marginRight: -UI_SIZE_8,
      borderRadius: UI_SIZE_20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: {
      opacity: 0.6,
    },
    recorder: {
      gap: UI_SIZE_8,
    },
    waveLane: {
      height: 56,
      justifyContent: 'center',
      overflow: 'hidden',
    },
    waveRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: RECORDING_BAR_GAP,
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
      includeFontPadding: false,
      color: theme.colors.text,
    },
    timerRecording: {
      color: c.primary,
    },
    recordButton: {
      width: UI_SIZE_64,
      height: UI_SIZE_64,
      borderRadius: UI_SIZE_32,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: md3Theme.colors.primaryContainer,
    },
    recordCore: {
      width: UI_SIZE_24,
      height: UI_SIZE_24,
      borderRadius: UI_SIZE_12,
      backgroundColor: md3Theme.colors.onPrimaryContainer,
    },
    recordStopCore: {
      borderRadius: UI_SIZE_4,
    },
    previewCard: {
      borderRadius: UI_SIZE_20,
      backgroundColor: c.surfaceContainerHigh ?? theme.colors.cardSurface,
    },
    previewContent: {
      padding: UI_SIZE_16,
    },
    previewText: {
      fontSize: FontSize.subtitle,
      lineHeight: 24,
      fontFamily: FontFamily.regular,
      color: c.onSurface,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: UI_SIZE_12,
      paddingTop: UI_SIZE_4,
    },
    iconButton: {
      width: UI_SIZE_54,
      height: UI_SIZE_54,
      borderRadius: UI_SIZE_28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: md3Theme.colors.secondaryContainer,
    },
    secondaryButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: UI_SIZE_8,
      minHeight: UI_SIZE_54,
      borderRadius: UI_SIZE_28,
      backgroundColor: md3Theme.colors.secondaryContainer,
    },
    secondaryButtonText: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: md3Theme.colors.onSecondaryContainer,
    },
    primaryButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: UI_SIZE_54,
      borderRadius: UI_SIZE_28,
      paddingHorizontal: UI_SIZE_14,
      backgroundColor: md3Theme.colors.primary,
    },
    primaryButtonText: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: md3Theme.colors.onPrimary,
    },
    buttonDisabled: {
      opacity: 0.4,
    },
  })
  return styles
}, useMD3Theme)
