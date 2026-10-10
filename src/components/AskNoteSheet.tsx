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
import { SymbolView } from 'expo-symbols'

import { AiBottomSheet } from '@/components/AiBottomSheet'
import { LocalAiWorkProgress } from '@/components/LocalAiWorkProgress'
import { RewriteChanges } from '@/components/RewriteChanges'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import { useAskNoteSheet } from '@/components/useAskNoteSheet'
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
  UI_SIZE_6,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_36,
  UI_SIZE_40,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import {
  ASK_KINDS,
  ASK_MAX_CHARACTERS,
  ASK_QUESTION_MAX_CHARS,
  type AskNoteSheetProps,
  type AskTurnView,
  canApplyAskTurn,
} from '@/lib/localAi/askNote'

const THREAD_MAX_HEIGHT_RATIO = 0.5
const DIFF_MAX_HEIGHT_RATIO = 0.3
const INPUT_MAX_LINES_HEIGHT = 110
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
  const { colors } = useTheme()
  const styles = useStyles()
  const { height: windowHeight } = useWindowDimensions()
  const threadRef = useRef<ScrollView>(null)
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

  const scopeLabel = scopeInfo.truncated
    ? t('localAi.ask.scopeNoteLong', { characters: NUMBER_FORMAT.format(ASK_MAX_CHARACTERS) })
    : t(scope === 'selection' ? 'localAi.ask.scopeSelection' : 'localAi.ask.scopeNote', {
        count: scopeInfo.words,
      })

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
            <SymbolView
              name="exclamationmark.triangle"
              size={UI_ICON_SIZE_14}
              tintColor={colors.error}
              weight="semibold"
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
              accessibilityRole="button"
              accessibilityState={{ disabled }}
              style={({ pressed }) => [
                styles.applyButton,
                turn.applied && styles.appliedButton,
                disabled && !turn.applied && commonStyles.disabled,
                pressed && commonStyles.pressed,
              ]}
            >
              {turn.applied && (
                <SymbolView
                  name="checkmark.circle.fill"
                  size={UI_ICON_SIZE_16}
                  tintColor={colors.diffAddText}
                  weight="semibold"
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
              style={({ pressed }) => [styles.copyButton, pressed && commonStyles.pressed]}
            >
              <SymbolView
                name="magnifyingglass"
                size={UI_ICON_SIZE_14}
                tintColor={colors.primary}
                weight="semibold"
              />
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
              accessibilityLabel={t(
                copiedId === turn.id ? 'localAi.actions.copied' : 'localAi.actions.copy',
              )}
              style={({ pressed }) => [styles.copyButton, pressed && commonStyles.pressed]}
            >
              <SymbolView
                name={copiedId === turn.id ? 'checkmark' : 'doc.on.doc'}
                size={UI_ICON_SIZE_14}
                tintColor={copiedId === turn.id ? colors.primary : colors.textSecondary}
                weight="semibold"
              />
              <Text style={styles.copyText}>
                {t(copiedId === turn.id ? 'localAi.actions.copied' : 'localAi.actions.copy')}
              </Text>
            </Pressable>
          )}
        </View>
      )
    },
    [
      busy,
      colors,
      copiedId,
      diffHeight,
      handleApply,
      handleCopy,
      handleSearchAllNotes,
      insertBlocked,
      meaningReady,
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

  return (
    <AiBottomSheet
      visible={visible}
      icon="questionmark.bubble"
      title={t(scope === 'selection' ? 'localAi.ask.titleSelection' : 'localAi.ask.titleNote')}
      subtitle={
        busy
          ? t('localAi.work.onDevice')
          : t(scope === 'selection' ? 'localAi.ask.subtitleSelection' : 'localAi.ask.subtitleNote')
      }
      avoidKeyboard
      onClose={handleClose}
    >
      {() => (
        <>
          <Pressable
            onPress={handleToggleScope}
            disabled={!hasSelection || busy}
            accessibilityRole="button"
            accessibilityHint={hasSelection ? t('localAi.ask.scopeSwitchHint') : undefined}
            style={({ pressed }) => [styles.scopeChip, pressed && commonStyles.pressed]}
          >
            <SymbolView
              name={scope === 'selection' ? 'text.cursor' : 'doc.text'}
              size={UI_ICON_SIZE_12}
              tintColor={colors.textSecondary}
              weight="semibold"
            />
            <Text style={styles.scopeText}>{scopeLabel}</Text>
            {hasSelection && (
              <SymbolView
                name="arrow.left.arrow.right"
                size={UI_ICON_SIZE_12}
                tintColor={colors.textSecondary}
                weight="semibold"
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
              placeholderTextColor={colors.textMuted}
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
              accessibilityRole="button"
              accessibilityLabel={t('localAi.ask.send')}
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
        </>
      )}
    </AiBottomSheet>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    scopeChip: {
      ...commonStyles.row,
      alignSelf: 'flex-start',
      gap: UI_SIZE_6,
      paddingHorizontal: UI_SIZE_10,
      paddingVertical: UI_SIZE_6,
      borderRadius: UI_SIZE_9999,
      backgroundColor: theme.colors.controlBackground,
    },
    scopeText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.textSecondary,
    },
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
    answerTextMuted: {
      color: theme.colors.textSecondary,
    },
    copyButton: {
      ...commonStyles.row,
      alignSelf: 'flex-start',
      gap: UI_SIZE_4,
    },
    copyText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.textSecondary,
    },
    searchAllText: {
      color: theme.colors.primary,
    },
    editsBlock: {
      gap: UI_SIZE_10,
    },
    editsTitle: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    applyButton: {
      ...commonStyles.row,
      justifyContent: 'center',
      gap: UI_SIZE_6,
      minHeight: UI_SIZE_40,
      borderRadius: UI_SIZE_9999,
      borderCurve: 'continuous',
      backgroundColor: theme.colors.primary,
    },
    appliedButton: {
      backgroundColor: theme.colors.diffAddBackground,
    },
    applyText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.onPrimary,
    },
    appliedText: {
      color: theme.colors.diffAddText,
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
