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

import { toMeaningSnippet } from '@pear-notes/core/store/services/localAiSearch.js'
import { VAULT_ASK_KIND } from '@pear-notes/core/store/services/localAiVaultAsk.js'
import { closeAskVault, getAskVault } from '@pear-notes/core/store/slices/uiSlice.js'

import { AiBottomSheet } from '@/components/AiBottomSheet'
import { LocalAiWorkProgress } from '@/components/LocalAiWorkProgress'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  UI_ICON_SIZE_14,
  UI_ICON_SIZE_16,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_36,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { ASK_QUESTION_MAX_CHARS } from '@/lib/localAi/askNote'

import {
  getShownSources,
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
    meaningReady,
    canSend,
    copiedId,
    savedId,
    handleSend,
    handleCopy,
    handleSave,
    handleClose,
    handleOpenNote,
    handleOpenSettings,
  } = useAskVaultSheet({
    visible: !!askVault,
    initialQuestion: askVault?.question ?? '',
    onClose: handleDismissed,
  })
  const threadStyle = useMemo(
    () => ({ maxHeight: windowHeight * THREAD_MAX_HEIGHT_RATIO }),
    [windowHeight],
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

  const renderSources = useCallback(
    (turn: VaultTurnView) => {
      const { isCited, shown } = getShownSources(turn)
      if (!shown.length) return null
      return (
        <View style={styles.sources}>
          <Text style={styles.sourcesTitle}>
            {t(isCited ? 'localAi.askVault.sources' : 'localAi.askVault.relatedNotes')}
          </Text>
          {shown.map((source) => (
            <Pressable
              key={`${turn.id}-${source.n}`}
              onPress={() => handleOpenNote(source.noteKey)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.sourceRow, pressed && commonStyles.pressed]}
            >
              <Text style={styles.sourceTitle} numberOfLines={1}>
                {isCited ? `[${source.n}] ` : ''}
                {source.title || t('activity.untitledNote')}
              </Text>
              <Text style={styles.sourceSnippet} numberOfLines={2}>
                {toMeaningSnippet(source.text)}
              </Text>
            </Pressable>
          ))}
        </View>
      )
    },
    [handleOpenNote, styles, t],
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
            {renderSources(turn)}
          </View>
        )
      }
      const copied = copiedId === turn.id
      const saved = savedId === turn.id
      return (
        <View style={styles.answerCard}>
          <Text style={styles.answerText} selectable>
            {renderAnswerText(turn)}
          </Text>
          {!turn.result.verified && (
            <Text style={styles.note}>{t('localAi.askVault.unverified')}</Text>
          )}
          {renderSources(turn)}
          <View style={styles.actions}>
            <Pressable
              onPress={() => handleCopy(turn.id)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t(copied ? 'localAi.actions.copied' : 'localAi.actions.copy')}
              style={({ pressed }) => [styles.actionButton, pressed && commonStyles.pressed]}
            >
              <SymbolView
                name={copied ? 'checkmark' : 'doc.on.doc'}
                size={UI_ICON_SIZE_14}
                tintColor={copied ? colors.primary : colors.textSecondary}
                weight="semibold"
              />
              <Text style={styles.actionText}>
                {t(copied ? 'localAi.actions.copied' : 'localAi.actions.copy')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleSave(turn.id)}
              disabled={saved}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityState={{ disabled: saved }}
              style={({ pressed }) => [styles.actionButton, pressed && commonStyles.pressed]}
            >
              <SymbolView
                name={saved ? 'checkmark.circle.fill' : 'doc.badge.plus'}
                size={UI_ICON_SIZE_14}
                tintColor={saved ? colors.primary : colors.textSecondary}
                weight="semibold"
              />
              <Text style={[styles.actionText, saved && styles.actionTextDone]}>
                {t(saved ? 'localAi.askVault.saved' : 'localAi.askVault.saveAsNote')}
              </Text>
            </Pressable>
          </View>
        </View>
      )
    },
    [
      colors,
      copiedId,
      handleCopy,
      handleSave,
      renderAnswerText,
      renderSources,
      savedId,
      styles,
      t,
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
      subtitle={busy ? t('localAi.work.onDevice') : t('localAi.askVault.subtitle')}
      avoidKeyboard
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
              editable={!busy && ready}
              style={styles.input}
              accessibilityLabel={t('localAi.askVault.inputLabel')}
            />
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
    sources: {
      gap: UI_SIZE_4,
    },
    sourcesTitle: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
    },
    sourceRow: {
      gap: UI_SIZE_2,
      paddingVertical: UI_SIZE_6,
    },
    sourceTitle: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    sourceSnippet: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
    },
    actions: {
      ...commonStyles.row,
      gap: UI_SIZE_14,
    },
    actionButton: {
      ...commonStyles.row,
      gap: UI_SIZE_4,
    },
    actionText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.textSecondary,
    },
    actionTextDone: {
      color: theme.colors.primary,
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
