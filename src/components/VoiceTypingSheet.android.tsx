import { Fragment, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { formatBytes } from '@pear-notes/core/utils.js'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { ImageDetailsPreview } from '@/components/ImageDetailsPreview'
import { LocalAiProcessing } from '@/components/LocalAiProcessing'
import { LocalAiWorkProgress } from '@/components/LocalAiWorkProgress'
import { RecordingWaveBar } from '@/components/RecordingWaveBar'
import { RewriteChanges } from '@/components/RewriteChanges'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import { fmtTimer, RECORDING_BAR_GAP, RECORDING_BARS } from '@/components/useAudioRecorderModal'
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
  SHEET_MAX_WIDTH,
  UI_ICON_SIZE_16,
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
  surfaceContainerLow?: string
  onSurfaceVariant?: string
}

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
  cleanUp: 'broom',
  myStyle: 'account-edit-outline',
  details: 'text-box-search-outline',
  fixGrammar: 'spellcheck',
  rewrite: 'auto-fix',
  makeShorter: 'arrow-collapse-vertical',
  makeProfessional: 'briefcase-outline',
  makeFriendly: 'emoticon-happy-outline',
  dictate: 'waveform',
  transcribe: 'text-box-outline',
  extract: 'text-recognition',
  describe: 'image-search-outline',
  translate: 'translate',
  summarizeNote: 'text-short',
  suggestTitle: 'format-title',
  keyPoints: 'format-list-bulleted',
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
  const { colors } = useTheme()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
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
    details,
    detailsTable,
    keepPhoto,
    handleToggleKeepPhoto,
    handleInsertDetails,
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
  const keys = details
    ? {
        title: `localAi.details.preview.${details.type}.title`,
        subtitle: `localAi.details.preview.${details.type}.subtitle`,
      }
    : heroKeys(mode, phase, error, scope)
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
  const mutedColor = c.onSurfaceVariant ?? colors.textSecondary

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
                <Text style={styles.title}>{title}</Text>
                {isWorking ? (
                  <View style={styles.onDeviceRow}>
                    <MaterialCommunityIcons
                      name="shield-check"
                      size={UI_ICON_SIZE_16}
                      color={mutedColor}
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
                <MaterialCommunityIcons name="close" size={UI_ICON_SIZE_24} color={mutedColor} />
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
                  <Text style={styles.languageLabel}>
                    {t('localAi.translateNote.noteLanguage')}
                  </Text>
                  <Text style={styles.languageValue}>{languageName(sourceLanguage)}</Text>
                  <MaterialCommunityIcons
                    name={sourcePickerOpen ? 'chevron-up' : 'chevron-down'}
                    size={UI_ICON_SIZE_20}
                    color={mutedColor}
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
                      renderLanguageChip(code, code === targetLanguage, () =>
                        handleChooseTarget(code),
                      ),
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

            {showProcessing && workView && (
              <LocalAiWorkProgress view={workView} languageName={languageName} />
            )}

            {showProcessing && !workView && (
              <LocalAiProcessing color={c.primary} captionColor={mutedColor} />
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

            {!!details && (
              <ImageDetailsPreview
                details={details}
                imageUri={sourceUri}
                keepPhoto={keepPhoto}
                maxHeight={windowHeight * PREVIEW_MAX_HEIGHT_RATIO}
                onToggleKeepPhoto={handleToggleKeepPhoto}
              />
            )}

            {phase === 'preview' && !rewriteDiff && !details && (
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
                    style={[
                      styles.summaryBlock,
                      mode === 'summarizeNote' && styles.summaryBlockFirst,
                    ]}
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
                          <Text style={styles.summaryHeading}>
                            {t(`localAi.summary.${section}`)}
                          </Text>
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
                color={c.primary}
                captionColor={mutedColor}
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
                <MaterialCommunityIcons name="creation" size={UI_ICON_SIZE_20} color={c.primary} />
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
                    <Text style={styles.primaryButtonText}>
                      {t('localAi.actions.openSettings')}
                    </Text>
                  </Pressable>
                ) : isError && hasSavedAudio ? (
                  <>
                    {canAttachAudio && (
                      <Pressable
                        onPress={handleAttachAudio}
                        style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                      >
                        <MaterialCommunityIcons
                          name="paperclip"
                          size={UI_ICON_SIZE_20}
                          color={md3.colors.onSecondaryContainer}
                        />
                        <Text style={styles.secondaryButtonText}>
                          {t('localAi.actions.attachAudio')}
                        </Text>
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
                ) : detailsTable ? (
                  <>
                    <Pressable
                      disabled={!canInsert}
                      onPress={() => handleInsertDetails(false)}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        !canInsert && styles.buttonDisabled,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.secondaryButtonText} numberOfLines={1}>
                        {t('localAi.details.insertText')}
                      </Text>
                    </Pressable>
                    <Pressable
                      disabled={!canInsert}
                      onPress={() => handleInsertDetails(true)}
                      style={({ pressed }) => [
                        styles.primaryButton,
                        !canInsert && styles.buttonDisabled,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.primaryButtonText} numberOfLines={1}>
                        {t('localAi.details.insertTable')}
                      </Text>
                    </Pressable>
                  </>
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
                      <MaterialCommunityIcons
                        name={copied ? 'check' : 'content-copy'}
                        size={UI_ICON_SIZE_20}
                        color={copied ? md3.colors.primary : md3.colors.onSecondaryContainer}
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
                    {phase === 'preview' && !details && (
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
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

const useStyles = createThemedStylesheetWithHooks((theme, md3Theme) => {
  const c = md3Theme.colors as ExtendedColors
  const sheetBg = c.surfaceContainerLow ?? c.surface
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
      width: '100%',
      maxWidth: SHEET_MAX_WIDTH,
      alignSelf: 'center',
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
      width: UI_SIZE_32 + UI_SIZE_4,
      height: UI_SIZE_4,
      borderRadius: 9999,
      alignSelf: 'center',
      marginTop: UI_SIZE_4,
      backgroundColor: hexWithAlpha(c.onSurfaceVariant ?? c.onSurface, 0.5),
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
      backgroundColor: hexWithAlpha(
        md3Theme.colors.primaryContainer || md3Theme.colors.primary,
        0.15,
      ),
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
    onDeviceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_4,
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
    liveCard: {
      minHeight: 72,
      maxHeight: 160,
      borderRadius: UI_SIZE_20,
      backgroundColor: c.surfaceContainerHigh ?? theme.colors.cardSurface,
    },
    liveContent: {
      padding: UI_SIZE_16,
    },
    liveText: {
      fontSize: FontSize.subtitle,
      lineHeight: 24,
      fontFamily: FontFamily.regular,
      color: c.onSurface,
    },
    livePlaceholder: {
      color: c.onSurfaceVariant ?? theme.colors.textMuted,
    },
    summaryBlock: {
      marginTop: UI_SIZE_14,
      paddingTop: UI_SIZE_12,
      gap: UI_SIZE_4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: hexWithAlpha(md3Theme.colors.onSurface, 0.12),
    },
    summaryHeading: {
      marginTop: UI_SIZE_4,
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurface,
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
      color: c.onSurface,
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
      color: c.onSurfaceVariant ?? theme.colors.textSecondary,
    },
    languageValue: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurface,
    },
    chipsScroll: {
      flexDirection: 'row',
      gap: UI_SIZE_8,
      paddingRight: UI_SIZE_8,
    },
    chip: {
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_8,
      borderRadius: UI_SIZE_8,
      borderWidth: 1,
      borderColor: hexWithAlpha(md3Theme.colors.onSurface, 0.2),
    },
    chipSelected: {
      borderColor: c.primary,
      backgroundColor: c.primaryContainer,
    },
    chipText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.medium,
      color: c.onSurfaceVariant ?? theme.colors.textSecondary,
    },
    chipTextSelected: {
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onPrimaryContainer,
    },
    disclaimer: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant ?? theme.colors.textMuted,
    },
    reportLink: {
      alignSelf: 'flex-start',
    },
    reportLinkText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: md3Theme.colors.primary,
    },
    summaryError: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: md3Theme.colors.error,
    },
    summarizeButton: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_8,
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_8,
      borderRadius: UI_SIZE_20,
      backgroundColor: hexWithAlpha(md3Theme.colors.primary, 0.14),
    },
    summarizeButtonText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: md3Theme.colors.primary,
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
