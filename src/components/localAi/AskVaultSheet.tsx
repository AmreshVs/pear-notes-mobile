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
import { SymbolView } from 'expo-symbols'

import { VAULT_ASK_KIND } from '@pear-notes/core/store/services/localAiVaultAsk.js'
import { closeAskVault, getAskVault } from '@pear-notes/core/store/slices/uiSlice.js'

import { AiBottomSheet } from '@/components/AiBottomSheet'
import { LocalAiWorkProgress } from '@/components/LocalAiWorkProgress'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import { VoiceTypingBar } from '@/components/VoiceTypingBar'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  UI_ICON_SIZE_12,
  UI_ICON_SIZE_14,
  UI_ICON_SIZE_16,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_36,
  UI_SIZE_52,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
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

const THREAD_MAX_HEIGHT_RATIO = 0.5
const INPUT_MAX_LINES_HEIGHT = 110

const noopLanguageName = (code: string | null) => code ?? ''

export function AskVaultSheet() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const dispatch = useDispatch()
  const { height: windowHeight } = useWindowDimensions()
  const threadRef = useRef<ScrollView>(null)
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
            <SymbolView
              name="exclamationmark.triangle"
              size={UI_ICON_SIZE_14}
              tintColor={colors.error}
              weight="semibold"
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
            <View style={styles.answeredBy}>
              <SymbolView
                name="laptopcomputer"
                size={UI_ICON_SIZE_12}
                tintColor={colors.textMuted}
                weight="semibold"
              />
              <Text style={styles.note}>
                {t('localAi.askVault.answeredBy', { device: turn.answeredOn })}
              </Text>
            </View>
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
      colors,
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
    <AiBottomSheet
      visible={!!askVault}
      icon="sparkles"
      title={t('localAi.askVault.title')}
      subtitle={subtitle}
      avoidKeyboard
      headerAccessory={
        currentFolder ? (
          <AskVaultScopePill scopeName={scopeName} disabled={busy} onToggle={toggleScope} />
        ) : undefined
      }
      onClose={handleClose}
    >
      {() => (
        <>
          {!ready && (
            <View style={styles.notReady}>
              <Text style={styles.answerTextMuted}>
                {t(meaningReady ? 'localAi.askVault.askNotReady' : 'localAi.askVault.notReady')}
              </Text>
              <Pressable
                onPress={handleOpenSettings}
                accessibilityRole="button"
                style={({ pressed }) => [styles.linkButton, pressed && commonStyles.pressed]}
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
              style={threadStyle}
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
            <View style={styles.dictationSlot}>
              <VoiceTypingBar
                visible={dictating}
                onLiveText={handleDictationText}
                onCommit={handleDictationCommit}
                onCancel={handleDictationCancel}
              />
            </View>
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
              placeholderTextColor={colors.textMuted}
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
                accessibilityRole="button"
                accessibilityLabel={t('localAi.askVault.dictate')}
                style={({ pressed }) => [
                  styles.micButton,
                  (busy || !ready) && commonStyles.disabled,
                  pressed && commonStyles.pressed,
                ]}
              >
                <SymbolView
                  name="mic"
                  size={UI_ICON_SIZE_16}
                  tintColor={colors.textSecondary}
                  weight="semibold"
                />
              </Pressable>
            )}
            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel={t('localAi.askVault.send')}
              accessibilityState={{ disabled: !canSend }}
              style={({ pressed }) => [
                styles.sendButton,
                !canSend && commonStyles.disabled,
                pressed && commonStyles.pressed,
              ]}
            >
              <SymbolView
                name="arrow.up"
                size={UI_ICON_SIZE_16}
                tintColor={colors.onPrimary}
                weight="bold"
              />
            </Pressable>
          </View>
          <Text style={styles.footer}>{t('localAi.askVault.footerPrivate')}</Text>
        </>
      )}
    </AiBottomSheet>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    thread: {
      gap: UI_SIZE_14,
    },
    turn: {
      gap: UI_SIZE_10,
    },
    questionBubble: {
      alignSelf: 'flex-end',
      maxWidth: '88%',
      paddingHorizontal: UI_SIZE_12,
      paddingVertical: UI_SIZE_8,
      borderRadius: Radii.lg,
      borderCurve: 'continuous',
      backgroundColor: theme.colors.primary,
    },
    questionText: {
      fontSize: FontSize.body,
      lineHeight: 21,
      fontFamily: FontFamily.medium,
      color: theme.colors.onPrimary,
    },
    answerCard: {
      gap: UI_SIZE_10,
      padding: UI_SIZE_14,
      borderRadius: Radii.card,
      borderCurve: 'continuous',
      backgroundColor: theme.colors.cardSurface,
    },
    answerCardMuted: {
      backgroundColor: theme.colors.controlBackground,
    },
    answerText: {
      fontSize: FontSize.subtitle,
      lineHeight: 24,
      fontFamily: FontFamily.regular,
      color: theme.colors.text,
    },
    indexNotice: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.textSecondary,
    },
    answerTextMuted: {
      fontSize: FontSize.subtitle,
      lineHeight: 24,
      fontFamily: FontFamily.regular,
      color: theme.colors.textSecondary,
    },
    chip: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: theme.colors.primary,
      backgroundColor: theme.colors.controlBackground,
    },
    answeredBy: {
      ...commonStyles.row,
      gap: UI_SIZE_4,
    },
    dictationSlot: {
      height: UI_SIZE_52,
    },
    micButton: {
      ...commonStyles.centered,
      width: UI_SIZE_36,
      height: UI_SIZE_36,
      borderRadius: UI_SIZE_9999,
      backgroundColor: theme.colors.controlBackground,
    },
    footer: {
      textAlign: 'center',
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
    },
    notReady: {
      gap: UI_SIZE_8,
      padding: UI_SIZE_14,
      borderRadius: Radii.card,
      borderCurve: 'continuous',
      backgroundColor: theme.colors.controlBackground,
    },
    linkButton: {
      alignSelf: 'flex-start',
    },
    linkText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.primary,
    },
    errorRow: {
      ...commonStyles.row,
      gap: UI_SIZE_8,
    },
    errorText: {
      ...commonStyles.flex1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.error,
    },
    note: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: UI_SIZE_8,
    },
    input: {
      ...commonStyles.flex1,
      maxHeight: INPUT_MAX_LINES_HEIGHT,
      paddingHorizontal: UI_SIZE_14,
      paddingTop: UI_SIZE_10,
      paddingBottom: UI_SIZE_10,
      borderRadius: Radii.lg,
      borderCurve: 'continuous',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.inputBorder,
      backgroundColor: theme.colors.inputBackground,
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.regular,
      color: theme.colors.text,
    },
    sendButton: {
      ...commonStyles.centered,
      width: UI_SIZE_36,
      height: UI_SIZE_36,
      borderRadius: UI_SIZE_9999,
      backgroundColor: theme.colors.primary,
    },
  })
  return styles
})
