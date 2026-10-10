import { Fragment, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SymbolView } from 'expo-symbols'

import { formatBytes } from '@pear-notes/core/utils.js'

import { GlassView } from '@/components/GlassView'
import { LocalAiProcessing } from '@/components/LocalAiProcessing'
import { LocalAiWorkProgress } from '@/components/LocalAiWorkProgress'
import { RecordingWaveBar } from '@/components/RecordingWaveBar'
import { RewriteChanges } from '@/components/RewriteChanges'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  fmtTimer,
  RECORDING_BAR_GAP,
  RECORDING_BAR_W,
  RECORDING_BARS,
} from '@/components/useAudioRecorderModal'
import {
  type AiScope,
  type InsertMeta,
  type TranscriptSummary,
  useVoiceTypingSheet,
  type VoiceTypingError,
  type VoiceTypingMode,
  type VoiceTypingPhase,
} from '@/components/useVoiceTypingSheet'
import {
  FontFamily,
  FontSize,
  FontWeight,
  GlassIntensity,
  Layout,
  Radii,
  SHEET_MAX_WIDTH,
  UI_ICON_SIZE_12,
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
  scope?: AiScope
  sourceUri: string | null
  sourceParagraphs?: string[] | null
  insertBlocked: boolean
  summaryAvailable?: boolean
  onInsert: (text: string, summary: TranscriptSummary | null, meta: InsertMeta) => void
  onAttachAudio?: (uri: string, durationMs: number) => void
  onClose: () => void
}

const HERO_BASE_BY_MODE: Record<VoiceTypingMode, string> = {
  dictate: 'localAi.voiceTyping',
  transcribe: 'localAi.transcribe',
  extract: 'localAi.extractText',
  details: 'localAi.details',
  describe: 'localAi.describeImage',
  translate: 'localAi.translateNote',
  summarizeNote: 'localAi.summarizeNote',
  suggestTitle: 'localAi.suggestTitle',
  keyPoints: 'localAi.keyPoints',
  fixGrammar: 'localAi.fixGrammar',
  rewrite: 'localAi.rewrite',
  makeShorter: 'localAi.makeShorter',
  makeProfessional: 'localAi.makeProfessional',
  makeFriendly: 'localAi.makeFriendly',
  cleanUp: 'localAi.cleanUp',
  myStyle: 'localAi.myStyle',
}

const SELECTION_HERO_BASE: Partial<Record<VoiceTypingMode, string>> = {
  summarizeNote: 'localAi.summarizeSelection',
  keyPoints: 'localAi.keyPointsSelection',
  translate: 'localAi.translateSelection',
}

const SELECTION_ERRORS: Partial<Record<VoiceTypingError, string>> = {
  empty: 'emptySelection',
  tooLong: 'selectionTooLong',
}

const ICON_BY_MODE: Record<VoiceTypingMode, string> = {
  cleanUp: 'sparkles',
  myStyle: 'person.text.rectangle',
  details: 'doc.text.magnifyingglass',
  fixGrammar: 'checkmark.circle',
  rewrite: 'wand.and.stars',
  makeShorter: 'arrow.down.right.and.arrow.up.left',
  makeProfessional: 'briefcase',
  makeFriendly: 'face.smiling',
  dictate: 'waveform',
  transcribe: 'text.quote',
  extract: 'text.viewfinder',
  describe: 'text.below.photo',
  translate: 'character.bubble',
  summarizeNote: 'text.alignleft',
  suggestTitle: 'textformat',
  keyPoints: 'list.bullet',
}

const NOTE_TASK_ERRORS: Partial<Record<VoiceTypingError, string>> = {
  empty: 'emptyNote',
  failed: 'failedNoteTask',
}

const ERROR_KEY_OVERRIDES: Partial<
  Record<VoiceTypingMode, Partial<Record<VoiceTypingError, string>>>
> = {
  extract: { empty: 'emptyImage', failed: 'failedExtract' },
  details: { empty: 'emptyImage', failed: 'failedExtract' },
  describe: { empty: 'emptyDescribe', failed: 'failedDescribe' },
  translate: {
    empty: 'emptyTranslate',
    failed: 'failedTranslate',
    noSpace: 'noSpace',
    downloadFailed: 'failedDownload',
  },
  summarizeNote: NOTE_TASK_ERRORS,
  suggestTitle: NOTE_TASK_ERRORS,
  keyPoints: NOTE_TASK_ERRORS,
  fixGrammar: NOTE_TASK_ERRORS,
  rewrite: NOTE_TASK_ERRORS,
  makeShorter: NOTE_TASK_ERRORS,
  makeProfessional: NOTE_TASK_ERRORS,
  makeFriendly: NOTE_TASK_ERRORS,
  cleanUp: NOTE_TASK_ERRORS,
  myStyle: NOTE_TASK_ERRORS,
}

function heroKeys(
  mode: VoiceTypingMode,
  phase: VoiceTypingPhase,
  error: VoiceTypingError | null,
  scope: AiScope,
) {
  const base = (scope === 'selection' && SELECTION_HERO_BASE[mode]) || HERO_BASE_BY_MODE[mode]
  if (phase === 'error') {
    const errorKey =
      (error && scope === 'selection' && SELECTION_ERRORS[error]) ||
      (error && ERROR_KEY_OVERRIDES[mode]?.[error]) ||
      error
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
  scope = 'note',
  sourceParagraphs = null,
  insertBlocked,
  summaryAvailable = false,
  onInsert,
  onAttachAudio,
  onClose,
}: VoiceTypingSheetProps) {
  const { t } = useTranslation()
  const { colors, isDark } = useTheme()
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false)
  const {
    phase,
    elapsed,
    text,
    liveText,
    isLive,
    error,
    workView,
    summary,
    summaryPhase,
    canSummarize,
    canReplace,
    rewriteDiff,
    sourceLanguage,
    targetLanguage,
    translateLanguages,
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
    hasSavedAudio,
    canAttachAudio,
    handleRetrySavedAudio,
    handleAttachAudio,
  } = useVoiceTypingSheet({
    visible,
    mode,
    sourceUri,
    scope,
    sourceParagraphs,
    summaryAvailable,
    onInsert,
    onAttachAudio,
    onClose,
  })

  const backdropAnimatedStyle = useAnimatedStyle(() => ({ opacity: sheetProgress.value }))
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - sheetProgress.value) * 700 }],
  }))

  if (!isPresented) return null

  const languageName = (code: string | null) => {
    if (!code) return ''
    return code === 'en'
      ? t('localAi.translateNote.english')
      : t(`settings.onDeviceAi.languages.${code}`)
  }
  const heroParams = {
    language: languageName(targetLanguage),
    percent: downloadProgress.percent,
    size: formatBytes(phase === 'error' ? noSpaceBytes : downloadProgress.missingBytes),
  }
  const keys = heroKeys(mode, phase, error, scope)
  const canInsert = phase === 'preview' && !insertBlocked && summaryPhase !== 'working'
  const isRecording = phase === 'recording'
  const isError = phase === 'error'
  const isBusy = phase === 'transcribing'
  const showRecorder = mode === 'dictate' && (phase === 'idle' || phase === 'recording')
  const showProcessing =
    phase === 'transcribing' ||
    phase === 'downloading' ||
    phase === 'preparing' ||
    (phase === 'idle' && mode !== 'dictate')
  const rewriteUnchanged = phase === 'preview' && !!rewriteDiff?.unchanged
  const showGeneratedDisclaimer =
    (mode === 'keyPoints' || mode === 'suggestTitle' || canReplace) && !rewriteUnchanged
  const showReportLink =
    mode === 'describe' ||
    mode === 'translate' ||
    mode === 'suggestTitle' ||
    mode === 'keyPoints' ||
    canReplace ||
    !!summary
  const title = rewriteUnchanged
    ? t('localAi.rewriteChanges.noChangesTitle')
    : t(keys.title, heroParams)
  const isWorking = phase === 'transcribing' || (phase === 'idle' && mode !== 'dictate')
  const subtitle = rewriteUnchanged
    ? t('localAi.rewriteChanges.noChangesSubtitle')
    : phase === 'preview' && insertBlocked
      ? t('localAi.conflictBlocked')
      : t(keys.subtitle, heroParams)

  const renderLanguageChip = (code: string, selected: boolean, onPress: () => void) => (
    <Pressable
      key={code}
      onPress={onPress}
      disabled={isBusy}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: isBusy }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {languageName(code)}
      </Text>
    </Pressable>
  )

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
          <Text style={styles.title}>{title}</Text>
          {isWorking ? (
            <View style={styles.onDeviceRow}>
              <SymbolView
                name="checkmark.shield.fill"
                size={UI_ICON_SIZE_12}
                tintColor={colors.textSecondary}
                weight="semibold"
              />
              <Text style={styles.subtitle}>{t('localAi.work.onDevice')}</Text>
            </View>
          ) : (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
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

      {mode === 'translate' && !!sourceLanguage && !isError && (
        <View style={styles.languagePanel}>
          <Pressable
            onPress={() => setSourcePickerOpen((open) => !open)}
            disabled={isBusy}
            accessibilityRole="button"
            accessibilityState={{ expanded: sourcePickerOpen, disabled: isBusy }}
            style={({ pressed }) => [styles.languageHeader, pressed && styles.pressed]}
          >
            <Text style={styles.languageLabel}>{t('localAi.translateNote.noteLanguage')}</Text>
            <Text style={styles.languageValue}>{languageName(sourceLanguage)}</Text>
            <SymbolView
              name={sourcePickerOpen ? 'chevron.up' : 'chevron.down'}
              size={UI_ICON_SIZE_16}
              tintColor={colors.textSecondary}
              weight="semibold"
            />
          </Pressable>
          {sourcePickerOpen && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
              accessibilityRole="radiogroup"
            >
              {translateLanguages.map((code) =>
                renderLanguageChip(code, code === sourceLanguage, () => {
                  setSourcePickerOpen(false)
                  handleChooseSource(code)
                }),
              )}
            </ScrollView>
          )}
          <Text style={styles.languageLabel}>{t('localAi.translateNote.to')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
            accessibilityRole="radiogroup"
          >
            {translateLanguages
              .filter((code) => code !== sourceLanguage)
              .map((code) =>
                renderLanguageChip(code, code === targetLanguage, () => handleChooseTarget(code)),
              )}
          </ScrollView>
        </View>
      )}

      {showRecorder && (
        <View style={styles.recorder}>
          {isLive && isRecording && (
            <ScrollView style={styles.liveCard} contentContainerStyle={styles.liveContent}>
              <Text
                style={[styles.liveText, !liveText && styles.livePlaceholder]}
                accessibilityLiveRegion="polite"
              >
                {liveText || t('localAi.livePlaceholder')}
              </Text>
            </ScrollView>
          )}
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

      {showProcessing && workView && (
        <LocalAiWorkProgress view={workView} languageName={languageName} />
      )}

      {showProcessing && !workView && (
        <LocalAiProcessing color={colors.primary} captionColor={colors.textSecondary} />
      )}

      {phase === 'preview' && rewriteDiff && (
        <RewriteChanges
          key={text}
          diff={rewriteDiff}
          resultText={text}
          showFixCount={mode === 'fixGrammar'}
          maxHeight={windowHeight * PREVIEW_MAX_HEIGHT_RATIO}
        />
      )}

      {phase === 'preview' && !rewriteDiff && (
        <ScrollView
          style={[styles.previewCard, { maxHeight: windowHeight * PREVIEW_MAX_HEIGHT_RATIO }]}
          contentContainerStyle={styles.previewContent}
        >
          {mode !== 'summarizeNote' && (
            <Text
              style={mode === 'suggestTitle' ? styles.titlePreview : styles.previewText}
              selectable
            >
              {text}
            </Text>
          )}
          {summary && (
            <View
              style={[styles.summaryBlock, mode === 'summarizeNote' && styles.summaryBlockFirst]}
            >
              {!!summary.summary && (
                <>
                  <Text style={styles.summaryHeading}>{t('localAi.summary.title')}</Text>
                  <Text style={styles.previewText} selectable>
                    {summary.summary}
                  </Text>
                </>
              )}
              {(
                [
                  ['decisions', summary.decisions],
                  ['actionItems', summary.actionItems],
                  ['openQuestions', summary.openQuestions],
                ] as const
              ).map(([section, items]) =>
                items?.length ? (
                  <Fragment key={section}>
                    <Text style={styles.summaryHeading}>{t(`localAi.summary.${section}`)}</Text>
                    {items.map((item, index) => (
                      <Text key={index} style={styles.previewText} selectable>
                        {`• ${item}`}
                      </Text>
                    ))}
                  </Fragment>
                ) : null,
              )}
            </View>
          )}
        </ScrollView>
      )}

      {phase === 'preview' && summaryPhase === 'working' && (
        <LocalAiProcessing
          color={colors.primary}
          captionColor={colors.textSecondary}
          caption={t('localAi.summary.working')}
        />
      )}

      {phase === 'preview' && summaryPhase === 'failed' && (
        <Text style={styles.summaryError}>{t('localAi.summary.failed')}</Text>
      )}

      {phase === 'preview' && !!summary && (
        <Text style={styles.disclaimer}>{t('localAi.summary.disclaimer')}</Text>
      )}

      {phase === 'preview' && showGeneratedDisclaimer && (
        <Text style={styles.disclaimer}>{t('localAi.generatedDisclaimer')}</Text>
      )}

      {phase === 'preview' && showReportLink && (
        <Pressable
          onPress={() => handleReportProblem(t('localAi.reportSubject'))}
          accessibilityRole="link"
          hitSlop={8}
          style={({ pressed }) => [styles.reportLink, pressed && styles.pressed]}
        >
          <Text style={styles.reportLinkText}>{t('localAi.actions.reportProblem')}</Text>
        </Pressable>
      )}

      {canSummarize && !summary && summaryPhase !== 'working' && (
        <Pressable
          onPress={handleSummarize}
          accessibilityRole="button"
          style={({ pressed }) => [styles.summarizeButton, pressed && styles.pressed]}
        >
          <SymbolView
            name="sparkles"
            size={UI_ICON_SIZE_16}
            tintColor={colors.primary}
            weight="semibold"
          />
          <Text style={styles.summarizeButtonText}>{t('localAi.summary.action')}</Text>
        </Pressable>
      )}

      {(phase === 'preview' || isError || phase === 'waiting') && (
        <View style={styles.actionsRow}>
          {isError && error === 'micDenied' ? (
            <Pressable
              onPress={handleOpenSettings}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.primaryButtonText}>{t('localAi.actions.openSettings')}</Text>
            </Pressable>
          ) : isError && hasSavedAudio ? (
            <>
              {canAttachAudio && (
                <Pressable
                  onPress={handleAttachAudio}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                >
                  <SymbolView
                    name="paperclip"
                    size={UI_ICON_SIZE_16}
                    tintColor={colors.text}
                    weight="semibold"
                  />
                  <Text style={styles.secondaryButtonText}>{t('localAi.actions.attachAudio')}</Text>
                </Pressable>
              )}
              <Pressable
                onPress={handleRetrySavedAudio}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.primaryButtonText}>{t('localAi.actions.again')}</Text>
              </Pressable>
            </>
          ) : phase === 'waiting' ? (
            <Pressable
              onPress={handleDownloadNow}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.primaryButtonText}>{t('localAi.actions.downloadNow')}</Text>
            </Pressable>
          ) : rewriteUnchanged ? (
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.primaryButtonText}>{t('common.done')}</Text>
            </Pressable>
          ) : phase === 'preview' && canReplace ? (
            <>
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
              <Pressable
                disabled={!canInsert}
                onPress={() => handleInsert('insert')}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  !canInsert && styles.buttonDisabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.secondaryButtonText} numberOfLines={1}>
                  {t('localAi.actions.insertBelow')}
                </Text>
              </Pressable>
              <Pressable
                disabled={!canInsert}
                onPress={() => handleInsert('replace')}
                style={({ pressed }) => [
                  styles.primaryButton,
                  !canInsert && styles.buttonDisabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.primaryButtonText} numberOfLines={1}>
                  {t('localAi.actions.replace')}
                </Text>
              </Pressable>
            </>
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
                  onPress={() => handleInsert('insert')}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    !canInsert && styles.buttonDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>
                    {t(
                      mode === 'suggestTitle'
                        ? 'localAi.actions.useTitle'
                        : scope === 'selection'
                          ? 'localAi.actions.insertBelow'
                          : 'localAi.actions.insert',
                    )}
                  </Text>
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
          <View style={styles.sheetSizer}>
            {isDark ? (
              <GlassView
                intensity={GlassIntensity.sheet}
                borderRadius={Radii.sheet}
                style={styles.sheet}
              >
                {body}
              </GlassView>
            ) : (
              <View style={[styles.sheet, styles.sheetLight]}>{body}</View>
            )}
          </View>
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
    sheetSizer: {
      width: '100%',
      maxWidth: SHEET_MAX_WIDTH,
      alignSelf: 'center',
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
    onDeviceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_4,
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
    liveCard: {
      minHeight: 72,
      maxHeight: 160,
      borderRadius: Radii.card,
      borderCurve: 'continuous',
      backgroundColor: theme.colors.cardSurface,
    },
    liveContent: {
      padding: UI_SIZE_14,
    },
    liveText: {
      fontSize: FontSize.subtitle,
      lineHeight: 24,
      fontFamily: FontFamily.regular,
      color: theme.colors.text,
    },
    livePlaceholder: {
      color: theme.colors.textMuted,
    },
    summaryBlock: {
      marginTop: UI_SIZE_14,
      paddingTop: UI_SIZE_12,
      gap: UI_SIZE_4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.separator,
    },
    summaryHeading: {
      marginTop: UI_SIZE_4,
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    summaryBlockFirst: {
      marginTop: 0,
      paddingTop: 0,
      borderTopWidth: 0,
    },
    titlePreview: {
      fontSize: FontSize.title,
      lineHeight: 28,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    languagePanel: {
      gap: UI_SIZE_8,
    },
    languageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: UI_SIZE_8,
    },
    languageLabel: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.textSecondary,
    },
    languageValue: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    chipsScroll: {
      flexDirection: 'row',
      gap: UI_SIZE_8,
      paddingRight: UI_SIZE_8,
    },
    chip: {
      paddingHorizontal: UI_SIZE_14,
      paddingVertical: UI_SIZE_8,
      borderRadius: 999,
      borderCurve: 'continuous',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.separator,
      backgroundColor: theme.colors.cardSurface,
    },
    chipSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}1F`,
    },
    chipText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.medium,
      color: theme.colors.textSecondary,
    },
    chipTextSelected: {
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.primary,
    },
    disclaimer: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
    },
    reportLink: {
      alignSelf: 'flex-start',
    },
    reportLinkText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.primary,
    },
    summaryError: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.error,
    },
    summarizeButton: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_8,
      paddingHorizontal: UI_SIZE_14,
      paddingVertical: UI_SIZE_8,
      borderRadius: 999,
      borderCurve: 'continuous',
      backgroundColor: `${theme.colors.primary}1F`,
    },
    summarizeButtonText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.primary,
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
      backgroundColor: theme.colors.cardSurface,
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
      backgroundColor: theme.colors.cardSurface,
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
