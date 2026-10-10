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

import { toMeaningSnippet } from '@pear-notes/core/store/services/localAiSearch.js'
import { VAULT_ASK_KIND } from '@pear-notes/core/store/services/localAiVaultAsk.js'
import { closeAskVault, getAskVault } from '@pear-notes/core/store/slices/uiSlice.js'

import { KeyboardSheetShell } from '@/components/android/KeyboardSheetShell'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { SHEET_ICON_CHIP_ALPHA } from '@/components/android/useSheetStyles'
import { LocalAiWorkProgress } from '@/components/LocalAiWorkProgress'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_24,
  UI_SIZE_2,
  UI_SIZE_4,
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

import {
  getShownSources,
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
  const subtitle = desktopTitle
    ? t('localAi.askVault.onMac', { device: desktopTitle })
    : busy
      ? t('localAi.work.onDevice')
      : t('localAi.askVault.subtitle')
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
              android_ripple={ripple}
              accessibilityRole="button"
              style={styles.sourceRow}
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
    [handleOpenNote, ripple, styles, t],
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
          {!!turn.answeredOn && (
            <Text style={styles.note}>
              {t('localAi.askVault.answeredOn', { device: turn.answeredOn })}
            </Text>
          )}
          {renderSources(turn)}
          <View style={styles.actions}>
            <Pressable
              onPress={() => handleCopy(turn.id)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t(copied ? 'localAi.actions.copied' : 'localAi.actions.copy')}
              style={styles.actionButton}
            >
              <MaterialCommunityIcons
                name={copied ? 'check' : 'content-copy'}
                size={UI_ICON_SIZE_16}
                color={copied ? c.primary : mutedColor}
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
              style={styles.actionButton}
            >
              <MaterialCommunityIcons
                name={saved ? 'check-circle' : 'file-plus-outline'}
                size={UI_ICON_SIZE_16}
                color={saved ? c.primary : mutedColor}
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
      c.error,
      c.primary,
      copiedId,
      handleCopy,
      handleSave,
      mutedColor,
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
    <KeyboardSheetShell visible={!!askVault} onClose={handleClose}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <MaterialCommunityIcons name="creation" size={UI_ICON_SIZE_20} color={c.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('localAi.askVault.title')}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
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
          placeholderTextColor={mutedColor}
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
          android_ripple={ripple}
          accessibilityRole="button"
          accessibilityLabel={t('localAi.askVault.send')}
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
    sources: {
      gap: UI_SIZE_4,
    },
    sourcesTitle: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onSurfaceVariant,
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
      color: c.onSurface,
    },
    sourceSnippet: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    actions: {
      ...commonStyles.row,
      gap: UI_SIZE_16,
    },
    actionButton: {
      ...commonStyles.row,
      gap: UI_SIZE_6,
    },
    actionText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.medium,
      color: c.onSurfaceVariant,
    },
    actionTextDone: {
      color: c.primary,
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
