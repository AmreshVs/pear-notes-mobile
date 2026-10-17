import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  type TextInput,
  View,
} from 'react-native'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { SymbolView } from 'expo-symbols'

import { VAULT_ASK_KIND } from '@pear-notes/core/store/services/localAiVaultAsk.js'

import { LocalAiWorkProgress } from '@/components/LocalAiWorkProgress'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  UI_ICON_SIZE_12,
  UI_ICON_SIZE_14,
  UI_ICON_SIZE_18,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_36,
} from '@/constants/commonStyles'
import { HIDDEN_SCROLL_EDGE_EFFECTS } from '@/constants/navigation'
import { useFocusAfterTransition } from '@/hooks/useFocusAfterTransition'
import { askIndexNoticeText } from '@/utils/askIndexNotice'

import { AskVaultAnswerActions } from './AskVaultAnswerActions'
import { AskVaultComposer } from './AskVaultComposer'
import { AskVaultDraftActions } from './AskVaultDraftActions'
import { AskVaultDraftCard } from './AskVaultDraftCard'
import { AskVaultHero } from './AskVaultHero'
import { AskVaultRecent } from './AskVaultRecent'
import { AskVaultRecentNotes } from './AskVaultRecentNotes'
import { AskVaultReminderAction } from './AskVaultReminderAction'
import { AskVaultScopePill } from './AskVaultScopePill'
import { AskVaultSources } from './AskVaultSources'
import { AskVaultSuggestions } from './AskVaultSuggestions'
import { useAskThreadScroll } from './useAskThreadScroll'
import {
  type AskThreadView,
  getTurnDraft,
  type RecentNoteView,
  splitAnswerCitations,
  useAskVaultSheet,
  type VaultTurnView,
} from './useAskVaultSheet'

const INLINE_RECENT_QUESTIONS = 3

const noopLanguageName = (code: string | null) => code ?? ''

export function AskVaultScreen() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const inputRef = useRef<TextInput>(null)
  useFocusAfterTransition(inputRef)
  const params = useLocalSearchParams<{ question?: string }>()
  const [showRecent, setShowRecent] = useState(false)
  const [composerHeight, setComposerHeight] = useState(0)
  const handleDismissed = useCallback(() => router.back(), [])
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
    recentNotes,
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
    handleOpenNote,
    handleOpenSettings,
  } = useAskVaultSheet({
    initialQuestion: typeof params.question === 'string' ? params.question : '',
    onClose: handleDismissed,
  })
  const heroSubtitle = indexNotice
    ? askIndexNoticeText(t, indexNotice)
    : desktopTitle
      ? t('localAi.askVault.onMac', { device: desktopTitle })
      : t('localAi.askVault.footerPrivate')
  const isEmpty = turns.length === 0
  const { threadRef, scrollProps } = useAskThreadScroll(isEmpty)
  const canShowRecent = ready && isEmpty && threads.length > 0
  const recentOpen = showRecent && canShowRecent
  const contentStyle = useMemo(
    () => ({ paddingTop: UI_SIZE_8, paddingBottom: composerHeight + UI_SIZE_20 }),
    [composerHeight],
  )

  const handleComposerLayout = useCallback(
    (event: LayoutChangeEvent) => setComposerHeight(event.nativeEvent.layout.height),
    [],
  )

  const toggleRecent = useCallback(() => setShowRecent((current) => !current), [])

  const inlineThreads = useMemo(() => threads.slice(0, INLINE_RECENT_QUESTIONS), [threads])

  const handleAskAboutNote = useCallback(
    (note: RecentNoteView) => {
      setQuestion(t('localAi.askVault.aboutNote', { title: note.title }))
      inputRef.current?.focus()
    },
    [setQuestion, t],
  )

  const handleOpenThread = useCallback(
    (thread: AskThreadView) => {
      setShowRecent(false)
      openThread(thread)
    },
    [openThread],
  )

  const renderScopeTitle = useCallback(
    () => <AskVaultScopePill scopeName={scopeName} disabled={busy} onToggle={toggleScope} />,
    [busy, scopeName, toggleScope],
  )

  const renderRecentButton = useCallback(
    () => (
      <Pressable
        onPress={toggleRecent}
        hitSlop={UI_SIZE_8}
        accessibilityRole="button"
        accessibilityLabel={t('localAi.askVault.recentQuestions')}
        accessibilityState={{ selected: recentOpen }}
        style={({ pressed }) => [styles.headerButton, pressed && commonStyles.pressed]}
      >
        <SymbolView
          name={recentOpen ? 'xmark' : 'clock.arrow.circlepath'}
          size={UI_ICON_SIZE_18}
          tintColor={colors.text}
          weight="semibold"
        />
      </Pressable>
    ),
    [colors.text, recentOpen, styles.headerButton, t, toggleRecent],
  )

  const screenOptions = useMemo(
    () => ({
      headerShown: true,
      headerTransparent: true,
      headerShadowVisible: false,
      headerBackButtonDisplayMode: 'minimal' as const,
      headerTintColor: colors.primary,
      headerTitleStyle: styles.headerTitle,
      scrollEdgeEffects: HIDDEN_SCROLL_EDGE_EFFECTS,
      title: t('localAi.askVault.title'),
      headerTitle: currentFolder ? renderScopeTitle : undefined,
      headerRight: canShowRecent ? renderRecentButton : undefined,
    }),
    [
      canShowRecent,
      colors.primary,
      currentFolder,
      renderRecentButton,
      renderScopeTitle,
      styles.headerTitle,
      t,
    ],
  )

  const titleOf = useCallback(
    (key: string) => notesData?.[key]?.title?.trim() || t('activity.untitledNote'),
    [notesData, t],
  )

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

  const renderEmpty = () => (
    <>
      <AskVaultHero subtitle={heroSubtitle} />
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
      {ready && suggestions.length > 0 && (
        <AskVaultSuggestions suggestions={suggestions} onSelect={handleSend} />
      )}
      {ready && recentNotes.length > 0 && (
        <AskVaultRecentNotes
          notes={recentNotes}
          metaOf={sourceMeta}
          onSelect={handleAskAboutNote}
        />
      )}
      {ready && inlineThreads.length > 0 && (
        <AskVaultRecent threads={inlineThreads} onOpen={handleOpenThread} onDelete={deleteThread} />
      )}
    </>
  )

  return (
    <View style={styles.screen}>
      <Stack.Screen options={screenOptions} />
      <ScrollView
        ref={threadRef}
        {...scrollProps}
        contentContainerStyle={[styles.content, contentStyle]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {recentOpen ? (
          <AskVaultRecent threads={threads} onOpen={handleOpenThread} onDelete={deleteThread} />
        ) : isEmpty ? (
          renderEmpty()
        ) : (
          turns.map(renderTurn)
        )}
      </ScrollView>

      <AskVaultComposer
        question={question}
        isEmpty={isEmpty}
        busy={busy}
        ready={ready}
        canSend={canSend}
        voiceReady={voiceReady}
        dictating={dictating}
        onChangeQuestion={setQuestion}
        onSend={handleSend}
        onStartDictation={handleStartDictation}
        onDictationText={handleDictationText}
        onDictationCommit={handleDictationCommit}
        onDictationCancel={handleDictationCancel}
        onLayout={handleComposerLayout}
        inputRef={inputRef}
      />
    </View>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    screen: {
      ...commonStyles.flex1,
      backgroundColor: theme.colors.background,
    },
    content: {
      gap: UI_SIZE_16,
      paddingHorizontal: UI_SIZE_16,
    },
    headerTitle: {
      color: theme.colors.text,
      fontWeight: FontWeight.bold,
      fontSize: FontSize.subtitle,
    },
    headerButton: {
      ...commonStyles.centered,
      width: UI_SIZE_36,
      height: UI_SIZE_36,
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
  })
  return styles
})
