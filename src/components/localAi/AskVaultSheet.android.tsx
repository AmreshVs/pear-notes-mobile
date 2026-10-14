import { useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { VAULT_ASK_KIND } from '@pear-notes/core/store/services/localAiVaultAsk.js'
import { closeAskVault, getAskVault } from '@pear-notes/core/store/slices/uiSlice.js'

import { KeyboardSheetShell, SHEET_GUTTER } from '@/components/android/KeyboardSheetShell'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { SHEET_ICON_CHIP_ALPHA } from '@/components/android/useSheetStyles'
import { LocalAiWorkProgress } from '@/components/LocalAiWorkProgress'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import { VoiceTypingBar } from '@/components/VoiceTypingBar'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_24,
  UI_SIZE_2,
  UI_SIZE_6,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_16,
  UI_SIZE_18,
  UI_SIZE_20,
  UI_SIZE_40,
  UI_SIZE_48,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import { ASK_QUESTION_MAX_CHARS } from '@/lib/localAi/askNote'
import { askIndexNoticeText } from '@/utils/askIndexNotice'

import { AskVaultAnswerActions } from './AskVaultAnswerActions'
import { AskVaultDraftActions } from './AskVaultDraftActions'
import { AskVaultDraftCard } from './AskVaultDraftCard'
import { AskVaultRecent } from './AskVaultRecent'
import { AskVaultReminderAction } from './AskVaultReminderAction'
import { AskVaultScopePill } from './AskVaultScopePill'
import { AskVaultSources } from './AskVaultSources'
import { AskVaultSuggestions } from './AskVaultSuggestions'
import {
  getTurnDraft,
  splitAnswerCitations,
  useAskVaultSheet,
  type VaultTurnView,
} from './useAskVaultSheet'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  surfaceContainerHighest?: string
  onSurfaceVariant?: string
}

const THREAD_MAX_HEIGHT_RATIO = 0.5
const INPUT_MAX_LINES_HEIGHT = 120

const noopLanguageName = (code: string | null) => code ?? ''

export function AskVaultSheet() {
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const dispatch = useDispatch()
  const { height: windowHeight } = useWindowDimensions()
  const threadRef = useRef<ScrollView>(null)
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const mutedColor = c.onSurfaceVariant ?? c.onSurface
  const askVault = useSelector(getAskVault) as { question: string } | null
  const handleDismissed = useCallback(() => dispatch(closeAskVault()), [dispatch])
  const {
    question,
    setQuestion,
    turns,
    workView,
    busy,
    ready,
    desktopTitle,
    meaningReady,
    indexNotice,
    canSend,
    copiedId,
    savedId,
    notesData,
    draftDone,
    currentFolder,
    scopeName,
    suggestions,
    threads,
    openThread,
    deleteThread,
    remindersOn,
    voiceReady,
    dictating,
    toggleReminders,
    toggleScope,
    reminderFor,
    sourceMeta,
    draftTargetOf,
    handleSend,
    handleCopy,
    handleSave,
    handleSaveDraft,
    handleAddDraft,
    handleStartDictation,
    handleDictationText,
    handleDictationCommit,
    handleDictationCancel,
    handleClose,
    handleOpenNote,
    handleOpenSettings,
  } = useAskVaultSheet({
    visible: !!askVault,
    initialQuestion: askVault?.question ?? '',
    onClose: handleDismissed,
  })
  const subtitle = desktopTitle
    ? t('localAi.askVault.onMac', { device: desktopTitle })
    : busy
      ? t('localAi.work.onDevice')
      : t('localAi.askVault.subtitle')
  const threadStyle = useMemo(
    () => ({ maxHeight: windowHeight * THREAD_MAX_HEIGHT_RATIO }),
    [windowHeight],
  )

  const footerPlace = useMemo(
    () =>
      [...turns].reverse().find((turn) => turn.status === 'done' && turn.answeredOn)?.answeredOn ||
      t('localAi.askVault.thisPhone'),
    [t, turns],
  )

  const titleOf = useCallback(
    (key: string) => notesData?.[key]?.title?.trim() || t('activity.untitledNote'),
    [notesData, t],
  )

  const scrollToEnd = useCallback(() => threadRef.current?.scrollToEnd({ animated: true }), [])

  const renderAnswerText = useCallback(
    (turn: VaultTurnView) =>
      splitAnswerCitations(turn.result?.answer ?? '', turn.sources).map((part, index) =>
        'source' in part ? (
          <Text
            key={`${turn.id}-${index}`}
            onPress={() => handleOpenNote(part.source.noteKey)}
            accessibilityRole="button"
            accessibilityLabel={part.source.title || t('activity.untitledNote')}
            style={styles.chip}
          >
            {` ${part.text} `}
          </Text>
        ) : (
          part.text
        ),
      ),
    [handleOpenNote, styles.chip, t],
  )

  const renderResult = useCallback(
    (turn: VaultTurnView) => {
      if (turn.status === 'working') {
        return workView ? (
          <LocalAiWorkProgress view={workView} languageName={noopLanguageName} />
        ) : null
      }
      if (turn.status === 'failed' || !turn.result) {
        return (
          <View style={styles.errorRow}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={UI_ICON_SIZE_20}
              color={c.error}
            />
            <Text style={styles.errorText}>
              {t(`localAi.askVault.errors.${turn.error ?? 'failed'}`)}
            </Text>
          </View>
        )
      }
      if (turn.result.kind === VAULT_ASK_KIND.NOT_FOUND) {
        return (
          <View style={[styles.answerCard, styles.answerCardMuted]}>
            <Text style={[styles.answerText, styles.answerTextMuted]}>
              {t('localAi.askVault.notFound')}
            </Text>
            {indexNotice && (
              <Text style={styles.indexNotice}>
                {t('localAi.askVault.indexNotice.notFoundHint')}
              </Text>
            )}
            <AskVaultSources turn={turn} sourceMeta={sourceMeta} onOpenNote={handleOpenNote} />
          </View>
        )
      }
      const copied = copiedId === turn.id
      const saved = savedId === turn.id
      const draft = getTurnDraft(turn)
      const done = draftDone[turn.id]
      const target = draft ? draftTargetOf(draft) : null
      const reminderDate = draft ? null : reminderFor(turn)
      return (
        <View style={styles.answerCard}>
          {draft ? (
            <AskVaultDraftCard turn={turn} draft={draft} onOpenNote={handleOpenNote} />
          ) : (
            <Text style={styles.answerText} selectable>
              {renderAnswerText(turn)}
            </Text>
          )}
          {!turn.result.verified && (
            <Text style={styles.note}>{t('localAi.askVault.unverified')}</Text>
          )}
          {!!turn.answeredOn && (
            <Text style={styles.note}>
              {t('localAi.askVault.answeredBy', { device: turn.answeredOn })}
            </Text>
          )}
          <AskVaultSources turn={turn} sourceMeta={sourceMeta} onOpenNote={handleOpenNote} />
          {draft && (
            <AskVaultDraftActions
              turnId={turn.id}
              done={done}
              target={target}
              titleOf={titleOf}
              onSave={handleSaveDraft}
              onAdd={handleAddDraft}
            />
          )}
          {!!reminderDate && (
            <AskVaultReminderAction
              date={reminderDate}
              enabled={remindersOn}
              onToggle={toggleReminders}
            />
          )}
          <AskVaultAnswerActions
            turnId={turn.id}
            copied={copied}
            saved={saved}
            canSave={!draft}
            onCopy={handleCopy}
            onSave={handleSave}
          />
        </View>
      )
    },
    [
      c.error,
      copiedId,
      draftDone,
      draftTargetOf,
      handleAddDraft,
      handleCopy,
      handleOpenNote,
      handleSave,
      handleSaveDraft,
      indexNotice,
      reminderFor,
      remindersOn,
      renderAnswerText,
      savedId,
      sourceMeta,
      styles,
      t,
      titleOf,
      toggleReminders,
      workView,
    ],
  )

  const renderTurn = useCallback(
    (turn: VaultTurnView) => (
      <View key={turn.id} style={styles.turn}>
        <View style={styles.questionBubble}>
          <Text style={styles.questionText}>{turn.question}</Text>
        </View>
        {renderResult(turn)}
      </View>
    ),
    [renderResult, styles],
  )

  return (
    <KeyboardSheetShell visible={!!askVault} onClose={handleClose}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <MaterialCommunityIcons name="creation" size={UI_ICON_SIZE_20} color={c.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('localAi.askVault.title')}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {!!currentFolder && (
          <AskVaultScopePill scopeName={scopeName} disabled={busy} onToggle={toggleScope} />
        )}
        <Pressable
          hitSlop={12}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          style={styles.closeButton}
        >
          <MaterialCommunityIcons name="close" size={UI_ICON_SIZE_24} color={mutedColor} />
        </Pressable>
      </View>

      {!ready && (
        <View style={styles.notReady}>
          <Text style={styles.answerTextMuted}>
            {t(meaningReady ? 'localAi.askVault.askNotReady' : 'localAi.askVault.notReady')}
          </Text>
          <Pressable
            onPress={handleOpenSettings}
            accessibilityRole="button"
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>{t('localAi.askVault.openSettings')}</Text>
          </Pressable>
        </View>
      )}

      {ready && indexNotice && (
        <Text style={styles.indexNotice} accessibilityRole="text">
          {askIndexNoticeText(t, indexNotice)}
        </Text>
      )}

      {turns.length > 0 && (
        <ScrollView
          ref={threadRef}
          style={[styles.threadScroll, threadStyle]}
          contentContainerStyle={styles.thread}
          onContentSizeChange={scrollToEnd}
          keyboardShouldPersistTaps="handled"
        >
          {turns.map(renderTurn)}
        </ScrollView>
      )}

      {ready && turns.length === 0 && suggestions.length > 0 && (
        <AskVaultSuggestions suggestions={suggestions} onSelect={handleSend} />
      )}

      {ready && turns.length === 0 && threads.length > 0 && (
        <AskVaultRecent threads={threads} onOpen={openThread} onDelete={deleteThread} />
      )}

      {dictating && (
        <VoiceTypingBar
          visible={dictating}
          inline
          onLiveText={handleDictationText}
          onCommit={handleDictationCommit}
          onCancel={handleDictationCancel}
        />
      )}

      <View style={styles.inputRow}>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder={t(
            turns.length > 0
              ? 'localAi.askVault.followUpPlaceholder'
              : 'localAi.askVault.placeholder',
          )}
          placeholderTextColor={mutedColor}
          multiline
          maxLength={ASK_QUESTION_MAX_CHARS}
          autoFocus
          editable={!busy && ready && !dictating}
          style={styles.input}
          accessibilityLabel={t('localAi.askVault.inputLabel')}
        />
        {voiceReady && !dictating && (
          <Pressable
            onPress={handleStartDictation}
            disabled={busy || !ready}
            android_ripple={ripple}
            accessibilityRole="button"
            accessibilityLabel={t('localAi.askVault.dictate')}
            accessibilityState={{ disabled: busy || !ready }}
            style={[styles.micButton, (busy || !ready) && commonStyles.disabled]}
          >
            <MaterialCommunityIcons
              name="microphone-outline"
              size={UI_ICON_SIZE_20}
              color={mutedColor}
            />
          </Pressable>
        )}
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          android_ripple={ripple}
          accessibilityRole="button"
          accessibilityLabel={t('localAi.askVault.send')}
          accessibilityState={{ disabled: !canSend }}
          style={[styles.sendButton, !canSend && commonStyles.disabled]}
        >
          <MaterialCommunityIcons name="send" size={UI_ICON_SIZE_20} color={c.onPrimary} />
        </Pressable>
      </View>
      <Text style={styles.footer}>{t('localAi.askVault.footer', { place: footerPlace })}</Text>
    </KeyboardSheetShell>
  )
}

const useStyles = createThemedStylesheetWithHooks((theme, md3Theme) => {
  const c = md3Theme.colors as ExtendedColors
  const styles = StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: UI_SIZE_12,
    },
    badge: {
      ...commonStyles.centered,
      width: UI_SIZE_40,
      height: UI_SIZE_40,
      borderRadius: UI_SIZE_12,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, SHEET_ICON_CHIP_ALPHA),
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
      color: c.onSurfaceVariant,
    },
    closeButton: {
      ...commonStyles.centered,
      width: UI_SIZE_40,
      height: UI_SIZE_40,
      marginTop: -UI_SIZE_6,
      marginRight: -UI_SIZE_8,
    },
    threadScroll: {
      marginHorizontal: -SHEET_GUTTER,
    },
    thread: {
      gap: UI_SIZE_16,
      paddingHorizontal: SHEET_GUTTER,
    },
    turn: {
      gap: UI_SIZE_12,
    },
    questionBubble: {
      alignSelf: 'flex-end',
      maxWidth: '88%',
      paddingHorizontal: UI_SIZE_14,
      paddingVertical: UI_SIZE_8,
      borderRadius: UI_SIZE_18,
      backgroundColor: c.primaryContainer,
    },
    questionText: {
      fontSize: FontSize.body,
      lineHeight: 21,
      fontFamily: FontFamily.medium,
      color: c.onPrimaryContainer,
    },
    answerCard: {
      gap: UI_SIZE_12,
      padding: UI_SIZE_16,
      borderRadius: UI_SIZE_20,
      backgroundColor: c.surfaceContainerHigh ?? theme.colors.cardSurface,
    },
    answerCardMuted: {
      backgroundColor: hexWithAlpha(c.onSurface, 0.06),
    },
    answerText: {
      fontSize: FontSize.subtitle,
      lineHeight: 24,
      fontFamily: FontFamily.regular,
      color: c.onSurface,
    },
    indexNotice: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    answerTextMuted: {
      fontSize: FontSize.subtitle,
      lineHeight: 24,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    chip: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onSecondaryContainer,
      backgroundColor: c.secondaryContainer,
    },
    micButton: {
      ...commonStyles.centered,
      width: UI_SIZE_48,
      height: UI_SIZE_48,
      borderRadius: UI_SIZE_9999,
      overflow: 'hidden',
    },
    footer: {
      textAlign: 'center',
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    notReady: {
      gap: UI_SIZE_8,
      padding: UI_SIZE_16,
      borderRadius: UI_SIZE_20,
      backgroundColor: hexWithAlpha(c.onSurface, 0.06),
    },
    linkButton: {
      alignSelf: 'flex-start',
    },
    linkText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.primary,
    },
    errorRow: {
      ...commonStyles.row,
      gap: UI_SIZE_8,
    },
    errorText: {
      ...commonStyles.flex1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.error,
    },
    note: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: UI_SIZE_8,
    },
    input: {
      ...commonStyles.flex1,
      maxHeight: INPUT_MAX_LINES_HEIGHT,
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_12,
      borderRadius: UI_SIZE_20,
      backgroundColor: c.surfaceContainerHighest ?? hexWithAlpha(c.onSurface, 0.06),
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.regular,
      color: c.onSurface,
    },
    sendButton: {
      ...commonStyles.centered,
      width: UI_SIZE_48,
      height: UI_SIZE_48,
      borderRadius: UI_SIZE_9999,
      overflow: 'hidden',
      backgroundColor: c.primary,
    },
  })
  return styles
}, useMD3Theme)
