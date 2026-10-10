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
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { KeyboardSheetShell } from '@/components/android/KeyboardSheetShell'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { SHEET_ICON_CHIP_ALPHA } from '@/components/android/useSheetStyles'
import { LocalAiWorkProgress } from '@/components/LocalAiWorkProgress'
import { RewriteChanges } from '@/components/RewriteChanges'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import { useAskNoteSheet } from '@/components/useAskNoteSheet'
import Colors from '@/constants/Colors'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_16,
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
import {
  ASK_KINDS,
  ASK_MAX_CHARACTERS,
  ASK_QUESTION_MAX_CHARS,
  type AskNoteSheetProps,
  type AskTurnView,
  canApplyAskTurn,
} from '@/lib/localAi/askNote'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  surfaceContainerHighest?: string
  surfaceContainerLow?: string
  onSurfaceVariant?: string
}

const THREAD_MAX_HEIGHT_RATIO = 0.5
const DIFF_MAX_HEIGHT_RATIO = 0.3
const INPUT_MAX_LINES_HEIGHT = 120
const NUMBER_FORMAT = new Intl.NumberFormat()
const APPLY_LABELS = {
  edits: { idle: 'localAi.ask.apply', done: 'localAi.ask.applied' },
  rewrite: { idle: 'localAi.ask.replaceSelection', done: 'localAi.ask.replaced' },
} as const

const noopLanguageName = (code: string | null) => code ?? ''

export function AskNoteSheet({
  visible,
  selectionText,
  noteText,
  insertBlocked,
  onApplyEdits,
  onClose,
}: AskNoteSheetProps) {
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const { height: windowHeight } = useWindowDimensions()
  const threadRef = useRef<ScrollView>(null)
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const mutedColor = c.onSurfaceVariant ?? c.onSurface
  const {
    scope,
    scopeInfo,
    hasSelection,
    question,
    setQuestion,
    turns,
    workView,
    busy,
    canSend,
    droppedTurns,
    emptySource,
    copiedId,
    meaningReady,
    handleSend,
    handleToggleScope,
    handleApply,
    handleCopy,
    handleSearchAllNotes,
    handleClose,
  } = useAskNoteSheet({ visible, selectionText, noteText, onApplyEdits, onClose })
  const threadStyle = useMemo(
    () => ({ maxHeight: windowHeight * THREAD_MAX_HEIGHT_RATIO }),
    [windowHeight],
  )
  const diffHeight = windowHeight * DIFF_MAX_HEIGHT_RATIO

  const scrollToEnd = useCallback(() => threadRef.current?.scrollToEnd({ animated: true }), [])

  const renderResult = useCallback(
    (turn: AskTurnView) => {
      if (turn.status === 'working') {
        return workView ? (
          <LocalAiWorkProgress view={workView} languageName={noopLanguageName} />
        ) : null
      }
      if (turn.status === 'failed') {
        return (
          <View style={styles.errorRow}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={UI_ICON_SIZE_20}
              color={c.error}
            />
            <Text style={styles.errorText}>{t(`localAi.ask.errors.${turn.error}`)}</Text>
          </View>
        )
      }
      if (turn.diff && turn.editedText !== null && canApplyAskTurn(turn, scope)) {
        const isRewrite = turn.kind === ASK_KINDS.REWRITE
        const disabled = turn.applied || insertBlocked || busy
        return (
          <View style={styles.editsBlock}>
            <Text style={styles.editsTitle}>
              {isRewrite
                ? t('localAi.ask.rewriteTitle')
                : t('localAi.ask.editsTitle', { count: turn.edits.length })}
            </Text>
            <RewriteChanges
              diff={turn.diff}
              resultText={turn.editedText}
              showFixCount={false}
              maxHeight={diffHeight}
            />
            {insertBlocked && !turn.applied && (
              <Text style={styles.note}>{t('localAi.conflictBlocked')}</Text>
            )}
            <Pressable
              onPress={() => handleApply(turn.id)}
              disabled={disabled}
              android_ripple={ripple}
              accessibilityRole="button"
              accessibilityState={{ disabled }}
              style={[
                styles.applyButton,
                turn.applied && styles.appliedButton,
                disabled && !turn.applied && commonStyles.disabled,
              ]}
            >
              {turn.applied && (
                <MaterialCommunityIcons
                  name="check-circle"
                  size={UI_ICON_SIZE_16}
                  color={styles.appliedText.color}
                />
              )}
              <Text style={[styles.applyText, turn.applied && styles.appliedText]}>
                {t(APPLY_LABELS[isRewrite ? 'rewrite' : 'edits'][turn.applied ? 'done' : 'idle'])}
              </Text>
            </Pressable>
          </View>
        )
      }
      const notFound = turn.kind === ASK_KINDS.NOT_FOUND
      const answer = turn.error
        ? t(`localAi.ask.errors.${turn.error}`)
        : turn.answer || t(notFound ? 'localAi.ask.notFoundFallback' : 'localAi.ask.errors.failed')
      const copied = copiedId === turn.id
      return (
        <View style={[styles.answerCard, notFound && styles.answerCardMuted]}>
          <Text style={[styles.answerText, notFound && styles.answerTextMuted]} selectable>
            {answer}
          </Text>
          {notFound && meaningReady && (
            <Pressable
              onPress={() => handleSearchAllNotes(turn.question)}
              hitSlop={8}
              accessibilityRole="button"
              style={styles.copyButton}
            >
              <MaterialCommunityIcons name="magnify" size={UI_ICON_SIZE_16} color={c.primary} />
              <Text style={[styles.copyText, styles.searchAllText]}>
                {t('localAi.askVault.searchAllNotes')}
              </Text>
            </Pressable>
          )}
          {!notFound && !!turn.answer && (
            <Pressable
              onPress={() => handleCopy(turn.id)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t(copied ? 'localAi.actions.copied' : 'localAi.actions.copy')}
              style={styles.copyButton}
            >
              <MaterialCommunityIcons
                name={copied ? 'check' : 'content-copy'}
                size={UI_ICON_SIZE_16}
                color={copied ? c.primary : mutedColor}
              />
              <Text style={styles.copyText}>
                {t(copied ? 'localAi.actions.copied' : 'localAi.actions.copy')}
              </Text>
            </Pressable>
          )}
        </View>
      )
    },
    [
      busy,
      c.error,
      c.primary,
      copiedId,
      diffHeight,
      handleApply,
      handleCopy,
      handleSearchAllNotes,
      insertBlocked,
      meaningReady,
      mutedColor,
      scope,
      ripple,
      styles,
      t,
      workView,
    ],
  )

  const renderTurn = useCallback(
    (turn: AskTurnView) => (
      <View key={turn.id} style={styles.turn}>
        <View style={styles.questionBubble}>
          <Text style={styles.questionText}>{turn.question}</Text>
        </View>
        {renderResult(turn)}
      </View>
    ),
    [renderResult, styles],
  )

  const scopeLabel = scopeInfo.truncated
    ? t('localAi.ask.scopeNoteLong', { characters: NUMBER_FORMAT.format(ASK_MAX_CHARACTERS) })
    : t(scope === 'selection' ? 'localAi.ask.scopeSelection' : 'localAi.ask.scopeNote', {
        count: scopeInfo.words,
      })

  return (
    <KeyboardSheetShell visible={visible} onClose={handleClose}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <MaterialCommunityIcons
            name="message-question-outline"
            size={UI_ICON_SIZE_20}
            color={c.primary}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            {t(scope === 'selection' ? 'localAi.ask.titleSelection' : 'localAi.ask.titleNote')}
          </Text>
          <Text style={styles.subtitle}>
            {busy
              ? t('localAi.work.onDevice')
              : t(
                  scope === 'selection'
                    ? 'localAi.ask.subtitleSelection'
                    : 'localAi.ask.subtitleNote',
                )}
          </Text>
        </View>
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

      <Pressable
        onPress={handleToggleScope}
        disabled={!hasSelection || busy}
        android_ripple={ripple}
        accessibilityRole="button"
        accessibilityHint={hasSelection ? t('localAi.ask.scopeSwitchHint') : undefined}
        style={styles.scopeChip}
      >
        <MaterialCommunityIcons
          name={scope === 'selection' ? 'format-text' : 'file-document-outline'}
          size={UI_ICON_SIZE_16}
          color={styles.scopeText.color}
        />
        <Text style={styles.scopeText}>{scopeLabel}</Text>
        {hasSelection && (
          <MaterialCommunityIcons
            name="swap-horizontal"
            size={UI_ICON_SIZE_16}
            color={styles.scopeText.color}
          />
        )}
      </Pressable>

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

      {droppedTurns && <Text style={styles.note}>{t('localAi.ask.droppedTurns')}</Text>}

      {emptySource && (
        <Text style={styles.note}>
          {t(scope === 'selection' ? 'localAi.ask.emptySelection' : 'localAi.ask.emptyNote')}
        </Text>
      )}

      <View style={styles.inputRow}>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder={t(
            turns.length > 0 ? 'localAi.ask.followUpPlaceholder' : 'localAi.ask.placeholder',
          )}
          placeholderTextColor={mutedColor}
          multiline
          maxLength={ASK_QUESTION_MAX_CHARS}
          autoFocus
          editable={!busy}
          style={styles.input}
          accessibilityLabel={t('localAi.ask.inputLabel')}
        />
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          android_ripple={ripple}
          accessibilityRole="button"
          accessibilityLabel={t('localAi.ask.send')}
          accessibilityState={{ disabled: !canSend }}
          style={[styles.sendButton, !canSend && commonStyles.disabled]}
        >
          <MaterialCommunityIcons name="send" size={UI_ICON_SIZE_20} color={c.onPrimary} />
        </Pressable>
      </View>
    </KeyboardSheetShell>
  )
}

const useStyles = createThemedStylesheetWithHooks((theme, md3Theme) => {
  const c = md3Theme.colors as ExtendedColors
  const diffColors = theme.isDark ? Colors.dark : Colors.light
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
    scopeChip: {
      ...commonStyles.row,
      alignSelf: 'flex-start',
      gap: UI_SIZE_6,
      paddingHorizontal: UI_SIZE_12,
      paddingVertical: UI_SIZE_6,
      borderRadius: UI_SIZE_9999,
      overflow: 'hidden',
      backgroundColor: c.secondaryContainer,
    },
    scopeText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.medium,
      color: c.onSecondaryContainer,
    },
    thread: {
      gap: UI_SIZE_16,
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
    answerTextMuted: {
      color: c.onSurfaceVariant,
    },
    copyButton: {
      ...commonStyles.row,
      alignSelf: 'flex-start',
      gap: UI_SIZE_6,
    },
    copyText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.medium,
      color: c.onSurfaceVariant,
    },
    searchAllText: {
      color: c.primary,
    },
    editsBlock: {
      gap: UI_SIZE_12,
    },
    editsTitle: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurface,
    },
    applyButton: {
      ...commonStyles.row,
      justifyContent: 'center',
      gap: UI_SIZE_6,
      minHeight: UI_SIZE_40,
      borderRadius: UI_SIZE_9999,
      overflow: 'hidden',
      backgroundColor: c.primary,
    },
    appliedButton: {
      backgroundColor: diffColors.diffAddBackground,
    },
    applyText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onPrimary,
    },
    appliedText: {
      color: diffColors.diffAddText,
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
