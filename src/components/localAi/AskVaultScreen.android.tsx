import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  type TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router, useLocalSearchParams } from 'expo-router'

import { VAULT_ASK_KIND } from '@pear-notes/core/store/services/localAiVaultAsk.js'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { LocalAiWorkProgress } from '@/components/LocalAiWorkProgress'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_24,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_16,
  UI_SIZE_18,
  UI_SIZE_20,
  UI_SIZE_40,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { useFocusAfterTransition } from '@/hooks/useFocusAfterTransition'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
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
import {
  type AskThreadView,
  getTurnDraft,
  type RecentNoteView,
  splitAnswerCitations,
  useAskVaultSheet,
  type VaultTurnView,
} from './useAskVaultSheet'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  onSurfaceVariant?: string
}

const MUTED_FILL_ALPHA = 0.06

const INLINE_RECENT_QUESTIONS = 3

const noopLanguageName = (code: string | null) => code ?? ''

export function AskVaultScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const threadRef = useRef<ScrollView>(null)
  const inputRef = useRef<TextInput>(null)
  useFocusAfterTransition(inputRef)
  const params = useLocalSearchParams<{ question?: string }>()
  const [showRecent, setShowRecent] = useState(false)
  const [composerHeight, setComposerHeight] = useState(0)
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const mutedColor = c.onSurfaceVariant ?? c.onSurface
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
  const canShowRecent = ready && isEmpty && threads.length > 0
  const recentOpen = showRecent && canShowRecent
  const headerStyle = useMemo(
    () => [styles.header, { paddingTop: insets.top }],
    [insets.top, styles],
  )
  const contentStyle = useMemo(
    () => [styles.content, { paddingBottom: composerHeight + UI_SIZE_20 }],
    [composerHeight, styles.content],
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
            style={styles.linkButton}
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

  const renderBody = () => {
    if (recentOpen) {
      return <AskVaultRecent threads={threads} onOpen={handleOpenThread} onDelete={deleteThread} />
    }
    return isEmpty ? renderEmpty() : turns.map(renderTurn)
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <View style={headerStyle}>
        <Pressable
          onPress={handleDismissed}
          android_ripple={ripple}
          hitSlop={UI_SIZE_12}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={styles.iconButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={UI_ICON_SIZE_24} color={c.onSurface} />
        </Pressable>
        <View style={styles.headerCenter}>
          {currentFolder ? (
            <AskVaultScopePill scopeName={scopeName} disabled={busy} onToggle={toggleScope} />
          ) : (
            <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
              {t('localAi.askVault.title')}
            </Text>
          )}
        </View>
        <View style={styles.headerEnd}>
          {canShowRecent && (
            <Pressable
              onPress={toggleRecent}
              android_ripple={ripple}
              hitSlop={UI_SIZE_8}
              accessibilityRole="button"
              accessibilityLabel={t('localAi.askVault.recentQuestions')}
              accessibilityState={{ selected: recentOpen }}
              style={styles.iconButton}
            >
              <MaterialCommunityIcons
                name={recentOpen ? 'close' : 'history'}
                size={UI_ICON_SIZE_24}
                color={mutedColor}
              />
            </Pressable>
          )}
        </View>
      </View>
      <ScrollView
        ref={threadRef}
        contentContainerStyle={contentStyle}
        onContentSizeChange={isEmpty ? undefined : scrollToEnd}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {renderBody()}
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

const useStyles = createThemedStylesheetWithHooks((theme, md3Theme) => {
  const c = md3Theme.colors as ExtendedColors
  const styles = StyleSheet.create({
    screen: {
      ...commonStyles.flex1,
      backgroundColor: c.background,
    },
    header: {
      ...commonStyles.row,
      gap: UI_SIZE_8,
      paddingHorizontal: UI_SIZE_8,
      paddingBottom: UI_SIZE_8,
    },
    headerCenter: {
      ...commonStyles.flex1,
      alignItems: 'flex-start',
    },
    headerEnd: {
      width: UI_SIZE_40,
      alignItems: 'flex-end',
    },
    iconButton: {
      ...commonStyles.centered,
      width: UI_SIZE_40,
      height: UI_SIZE_40,
      borderRadius: UI_SIZE_9999,
      overflow: 'hidden',
    },
    title: {
      fontSize: FontSize.title,
      lineHeight: 26,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onSurface,
    },
    content: {
      gap: UI_SIZE_16,
      paddingHorizontal: UI_SIZE_16,
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
      backgroundColor: hexWithAlpha(c.onSurface, MUTED_FILL_ALPHA),
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
    notReady: {
      gap: UI_SIZE_8,
      padding: UI_SIZE_16,
      borderRadius: UI_SIZE_20,
      backgroundColor: hexWithAlpha(c.onSurface, MUTED_FILL_ALPHA),
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
      lineHeight: 20,
      fontFamily: FontFamily.regular,
      color: c.error,
    },
    note: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
  })
  return styles
}, useMD3Theme)
