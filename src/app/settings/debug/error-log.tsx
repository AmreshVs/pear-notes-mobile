import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  type TextStyle,
  View as RNView,
} from 'react-native'

import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_13,
  UI_ICON_SIZE_15,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_6,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import type { ErrorLogEntry } from '@/lib/debugSnapshot'
import { getClearErrorLogLabels } from '@/utils/debugRows'

import { useErrorLogScreen } from './useErrorLogScreen'

type ErrorLogStyles = ReturnType<typeof useStyles>

const SOURCE_BACKEND = 'backend'

type EntryRowProps = {
  styles: ErrorLogStyles
  levelStyle: StyleProp<TextStyle>
  entry: ErrorLogEntry
  entryKey: string
  expanded: boolean
  onToggle: (key: string) => void
  mutedColor: string
  repeatedLabel: string
}

function EntryRow({
  styles,
  levelStyle,
  entry,
  entryKey,
  expanded,
  onToggle,
  mutedColor,
  repeatedLabel,
}: EntryRowProps) {
  const handlePress = useCallback(() => onToggle(entryKey), [entryKey, onToggle])

  return (
    <Pressable onPress={handlePress} disabled={!entry.detail} style={styles.entry}>
      <RNView style={styles.entryMeta}>
        <Text style={levelStyle}>{entry.level}</Text>
        <Text style={styles.entryTime}>{entry.source || SOURCE_BACKEND}</Text>
        <Text style={styles.entryTime}>{new Date(entry.at).toLocaleString()}</Text>
        {entry.detail ? (
          <SymbolIcon
            name={expanded ? 'chevron.down' : 'chevron.right'}
            size={UI_ICON_SIZE_13}
            color={mutedColor}
          />
        ) : null}
      </RNView>
      {entry.count > 1 ? <Text style={styles.entryTime}>{repeatedLabel}</Text> : null}
      <Text style={styles.entryMessage}>{entry.message}</Text>
      {expanded && entry.detail ? <Text style={styles.entryDetail}>{entry.detail}</Text> : null}
    </Pressable>
  )
}

export default function ErrorLogScreen() {
  const { t } = useTranslation()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const { colors } = useTheme()
  const {
    entries,
    loaded,
    error,
    refreshing,
    sharing,
    expanded,
    toggleEntry,
    handleRefresh,
    handleShare,
    handleClear,
  } = useErrorLogScreen()

  const onShare = useCallback(() => handleShare(t('debug.errorLog.shareMessage')), [handleShare, t])
  const onClear = useCallback(() => handleClear(getClearErrorLogLabels(t)), [handleClear, t])

  const levelStyles = useMemo<Record<string, StyleProp<TextStyle>>>(
    () => ({
      fatal: styles.levelError,
      error: styles.levelError,
      warn: styles.levelWarn,
      info: styles.levelInfo,
      debug: styles.levelInfo,
    }),
    [styles],
  )

  const renderEntry = useCallback(
    (entry: ErrorLogEntry, index: number) => {
      const entryKey = `${entry.at}-${index}`
      return (
        <EntryRow
          key={entryKey}
          styles={styles}
          levelStyle={levelStyles[entry.level] ?? styles.levelError}
          entry={entry}
          entryKey={entryKey}
          expanded={!!expanded[entryKey]}
          onToggle={toggleEntry}
          mutedColor={colors.textMuted}
          repeatedLabel={t('debug.errorLog.repeated', {
            count: entry.count,
            time: new Date(entry.lastAt).toLocaleTimeString(),
          })}
        />
      )
    },
    [colors.textMuted, expanded, levelStyles, styles, t, toggleEntry],
  )

  return (
    <ScrollView
      style={commonStyles.flex1}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <Text style={styles.description}>{t('debug.errorLog.description')}</Text>

      <RNView style={styles.actions}>
        <Pressable onPress={onShare} disabled={sharing} style={styles.primaryButton}>
          <SymbolIcon name="square.and.arrow.up" size={UI_ICON_SIZE_15} color={colors.background} />
          <Text style={styles.primaryButtonText}>{t('debug.errorLog.share')}</Text>
        </Pressable>
        <Pressable onPress={handleRefresh} disabled={refreshing} style={styles.secondaryButton}>
          <SymbolIcon name="arrow.clockwise" size={UI_ICON_SIZE_15} color={colors.primary} />
          <Text style={styles.secondaryButtonText}>{t('debug.refresh')}</Text>
        </Pressable>
        <Pressable onPress={onClear} disabled={entries.length === 0} style={styles.secondaryButton}>
          <SymbolIcon name="trash" size={UI_ICON_SIZE_15} color={colors.error} />
          <Text style={styles.destructiveButtonText}>{t('debug.errorLog.clear')}</Text>
        </Pressable>
      </RNView>

      {error ? (
        <RNView style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </RNView>
      ) : null}

      {!loaded ? (
        <Text style={styles.muted}>{t('debug.errorLog.loading')}</Text>
      ) : entries.length === 0 ? (
        <Text style={styles.muted}>{t('debug.errorLog.empty')}</Text>
      ) : (
        <RNView style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('debug.errorLog.count', { count: entries.length })}
          </Text>
          <RNView style={commonThemedStyles.card}>{entries.map(renderEntry)}</RNView>
        </RNView>
      )}
    </ScrollView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const levelBase = {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase' as const,
  }
  const styles = StyleSheet.create({
    content: {
      padding: Space.base,
      paddingBottom: Space.scrollBottom,
    },
    description: {
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
      marginBottom: Space.base,
    },
    actions: {
      flexDirection: 'row',
      gap: Space.sm,
      marginBottom: Space.base,
      flexWrap: 'wrap',
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_6,
      paddingHorizontal: Space.base,
      paddingVertical: Space.sm,
      borderRadius: Radii.pill,
      backgroundColor: theme.colors.primary,
    },
    primaryButtonText: {
      color: theme.colors.background,
      fontFamily: FontFamily.bold,
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_6,
      paddingHorizontal: Space.base,
      paddingVertical: Space.sm,
      borderRadius: Radii.pill,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.borderSecondary,
    },
    secondaryButtonText: {
      color: theme.colors.primary,
      fontFamily: FontFamily.semiBold,
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
    },
    destructiveButtonText: {
      color: theme.colors.error,
      fontFamily: FontFamily.semiBold,
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
    },
    section: {
      marginBottom: Space.lg,
    },
    sectionTitle: {
      fontFamily: FontFamily.bold,
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      color: theme.colors.textMuted,
      marginBottom: Space.sm,
      marginLeft: UI_SIZE_4,
      textTransform: 'uppercase',
    },
    entry: {
      paddingHorizontal: Space.base,
      paddingVertical: Space.sm,
      gap: UI_SIZE_2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.borderSecondary,
    },
    entryMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.sm,
    },
    levelError: { ...levelBase, color: theme.colors.error },
    levelWarn: { ...levelBase, color: theme.colors.warning },
    levelInfo: { ...levelBase, color: theme.colors.textMuted },
    entryTime: {
      fontFamily: FontFamily.mono,
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
      flexShrink: 1,
    },
    entryMessage: {
      fontFamily: FontFamily.mono,
      fontSize: FontSize.caption,
      color: theme.colors.text,
    },
    entryDetail: {
      fontFamily: FontFamily.mono,
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
      marginTop: UI_SIZE_4,
    },
    errorBox: {
      padding: Space.base,
      borderRadius: Radii.card,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.borderSecondary,
      marginBottom: Space.base,
    },
    errorText: {
      fontFamily: FontFamily.mono,
      fontSize: FontSize.caption,
      color: theme.colors.text,
    },
    muted: {
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
    },
  })
  return styles
})
