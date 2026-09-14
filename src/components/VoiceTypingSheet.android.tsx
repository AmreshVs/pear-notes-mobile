import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
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
  UI_SIZE_48,
  UI_SIZE_54,
} from '@/constants/commonStyles'

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
  const { colors } = useTheme()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
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

            <View style={styles.headerRow}>
              <Pressable
                hitSlop={12}
                onPress={handleClose}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                style={({ pressed }) => [styles.headerIconButton, pressed && styles.pressed]}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={UI_ICON_SIZE_24}
                  color={c.onSurfaceVariant ?? colors.textSecondary}
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
                  (!canInsert || pressed) && styles.pressed,
                ]}
              >
                <MaterialCommunityIcons
                  name="check"
                  size={UI_ICON_SIZE_24}
                  color={canInsert ? c.primary : (c.onSurfaceVariant ?? colors.textMuted)}
                />
              </Pressable>
            </View>

            <View style={styles.heroBlock}>
              <Text style={styles.heroTitle}>{t(keys.title)}</Text>
              <Text style={styles.heroSubtitle}>
                {phase === 'preview' && insertBlocked
                  ? t('localAi.conflictBlocked')
                  : t(keys.subtitle)}
              </Text>
            </View>

            {showRecorder && (
              <>
                <View style={styles.recordingWave}>
                  <View style={styles.recordingBarsRow}>
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
                    style={({ pressed }) => [
                      styles.recordButton,
                      pressed && styles.recordButtonPressed,
                    ]}
                  >
                    <View style={styles.recordOuterRing}>
                      <View
                        style={[styles.recordCore, isRecording && styles.recordCoreRecording]}
                      />
                    </View>
                  </Pressable>
                  <Text style={styles.recordHint}>
                    {isRecording
                      ? t('localAi.voiceTyping.stopHint')
                      : t('localAi.voiceTyping.startHint')}
                  </Text>
                </View>
              </>
            )}

            {phase === 'transcribing' && (
              <View style={styles.statusBlock}>
                <ActivityIndicator size="large" color={c.primary} />
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

            <View style={{ height: Math.max(insets.bottom, 8) + UI_SIZE_8 }} />
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
      gap: UI_SIZE_16,
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
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerIconButton: {
      width: UI_SIZE_48,
      height: UI_SIZE_48,
      borderRadius: UI_SIZE_24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: {
      opacity: 0.6,
    },
    heroBlock: {
      alignItems: 'center',
      gap: UI_SIZE_8,
    },
    heroTitle: {
      fontSize: FontSize.heading,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      textAlign: 'center',
      letterSpacing: -0.3,
      color: theme.colors.text,
    },
    heroSubtitle: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      textAlign: 'center',
      lineHeight: UI_SIZE_20,
      paddingHorizontal: UI_SIZE_12,
      color: theme.colors.textSecondary,
    },
    recordingWave: {
      height: 84,
      justifyContent: 'center',
      overflow: 'hidden',
    },
    recordingBarsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: RECORDING_BAR_GAP,
    },
    timer: {
      fontSize: 44,
      lineHeight: 52,
      fontWeight: '300',
      fontFamily: FontFamily.mono,
      textAlign: 'center',
      includeFontPadding: false,
      color: theme.colors.text,
    },
    timerRecording: {
      color: c.primary,
    },
    controlsSection: {
      alignItems: 'center',
      gap: UI_SIZE_16,
      paddingBottom: UI_SIZE_8,
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
      backgroundColor: md3Theme.colors.primaryContainer,
    },
    recordCore: {
      width: UI_SIZE_32,
      height: UI_SIZE_32,
      borderRadius: UI_SIZE_16,
      backgroundColor: md3Theme.colors.onPrimaryContainer,
    },
    recordCoreRecording: {
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
    statusBlock: {
      minHeight: 160,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewCard: {
      maxHeight: 240,
      borderRadius: UI_SIZE_20,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
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
    },
    secondaryButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: UI_SIZE_8,
      minHeight: UI_SIZE_54,
      paddingHorizontal: UI_SIZE_14,
      borderRadius: UI_SIZE_16,
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
      borderRadius: UI_SIZE_16,
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
