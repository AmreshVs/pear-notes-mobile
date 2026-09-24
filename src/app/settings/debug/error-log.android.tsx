import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Pressable,
  ScrollView,
  StatusBar,
  type StyleProp,
  StyleSheet,
  Text,
  type TextStyle,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router, Stack } from 'expo-router'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_18,
  UI_ICON_SIZE_24,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_28,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
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
  ripple: ReturnType<typeof androidRipple>
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
  ripple,
}: EntryRowProps) {
  const handlePress = useCallback(() => onToggle(entryKey), [entryKey, onToggle])

  return (
    <Pressable
      onPress={handlePress}
      disabled={!entry.detail}
      android_ripple={ripple}
      style={styles.entry}
    >
      <View style={styles.entryMeta}>
        <Text style={levelStyle}>{entry.level}</Text>
        <Text style={styles.entryTime}>{entry.source || SOURCE_BACKEND}</Text>
        <Text style={styles.entryTime}>{new Date(entry.at).toLocaleString()}</Text>
        {entry.detail ? (
          <MaterialCommunityIcons
            name={expanded ? 'chevron-down' : 'chevron-right'}
            size={UI_ICON_SIZE_18}
            color={mutedColor}
          />
        ) : null}
      </View>
      {entry.count > 1 ? <Text style={styles.entryTime}>{repeatedLabel}</Text> : null}
      <Text style={styles.entryMessage}>{entry.message}</Text>
      {expanded && entry.detail ? <Text style={styles.entryDetail}>{entry.detail}</Text> : null}
    </Pressable>
  )
}

export default function ErrorLogScreenAndroid() {
  const { t } = useTranslation()
  const styles = useStyles()
  const { colors } = useMD3Theme()
  const ripple = useMemo(() => androidRipple(colors.onSurface), [colors.onSurface])
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

  const handleBack = useCallback(() => router.back(), [])
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
          mutedColor={colors.onSurfaceVariant}
          ripple={ripple}
          repeatedLabel={t('debug.errorLog.repeated', {
            count: entry.count,
            time: new Date(entry.lastAt).toLocaleTimeString(),
          })}
        />
      )
    },
    [colors.onSurfaceVariant, expanded, levelStyles, ripple, styles, t, toggleEntry],
  )

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="default" backgroundColor={colors.background} />
      <View style={styles.header}>
        <Pressable onPress={handleBack} android_ripple={ripple} style={styles.backButton}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={UI_ICON_SIZE_24}
            color={colors.onSurface}
          />
        </Pressable>
        <Text style={styles.headerTitle}>{t('layouts.errorLog')}</Text>
      </View>

      <ScrollView style={commonStyles.flex1} contentContainerStyle={styles.content}>
        <Text style={styles.description}>{t('debug.errorLog.description')}</Text>

        <View style={styles.actions}>
          <Pressable
            onPress={onShare}
            disabled={sharing}
            android_ripple={ripple}
            style={styles.primaryButton}
          >
            <MaterialCommunityIcons
              name="share-variant"
              size={UI_ICON_SIZE_18}
              color={colors.onPrimary}
            />
            <Text style={styles.primaryButtonText}>{t('debug.errorLog.share')}</Text>
          </Pressable>
          <Pressable
            onPress={handleRefresh}
            disabled={refreshing}
            android_ripple={ripple}
            style={styles.secondaryButton}
          >
            <MaterialCommunityIcons name="refresh" size={UI_ICON_SIZE_18} color={colors.primary} />
            <Text style={styles.secondaryButtonText}>{t('debug.refresh')}</Text>
          </Pressable>
          <Pressable
            onPress={onClear}
            disabled={entries.length === 0}
            android_ripple={ripple}
            style={styles.secondaryButton}
          >
            <MaterialCommunityIcons
              name="delete-outline"
              size={UI_ICON_SIZE_18}
              color={colors.error}
            />
            <Text style={styles.destructiveButtonText}>{t('debug.errorLog.clear')}</Text>
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!loaded ? (
          <Text style={styles.muted}>{t('debug.errorLog.loading')}</Text>
        ) : entries.length === 0 ? (
          <Text style={styles.muted}>{t('debug.errorLog.empty')}</Text>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('debug.errorLog.count', { count: entries.length })}
            </Text>
            <View style={styles.card}>{entries.map(renderEntry)}</View>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
}

const useErrorLogHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3, insets }) => {
  const c = md3.colors as ExtendedColors
  const levelBase = {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase' as const,
  }

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.sm,
      paddingTop: insets.top + Space.sm,
      paddingHorizontal: Space.sm,
      paddingBottom: Space.sm,
    },
    backButton: {
      overflow: 'hidden',
      padding: Space.sm,
      borderRadius: UI_SIZE_9999,
    },
    headerTitle: {
      fontFamily: FontFamily.bold,
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      color: c.onSurface,
    },
    content: {
      paddingHorizontal: Space.base,
      paddingBottom: Space.scrollBottom,
    },
    description: {
      fontFamily: FontFamily.regular,
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
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
      paddingHorizontal: Space.lg,
      paddingVertical: Space.md,
      borderRadius: UI_SIZE_9999,
      backgroundColor: c.primary,
      overflow: 'hidden',
    },
    primaryButtonText: {
      color: c.onPrimary,
      fontFamily: FontFamily.bold,
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_6,
      paddingHorizontal: Space.lg,
      paddingVertical: Space.md,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
      overflow: 'hidden',
    },
    secondaryButtonText: {
      color: c.primary,
      fontFamily: FontFamily.semiBold,
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
    },
    destructiveButtonText: {
      color: c.error,
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
      color: c.onSurfaceVariant,
      marginBottom: Space.sm,
      marginLeft: UI_SIZE_4,
      textTransform: 'uppercase',
    },
    card: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      paddingVertical: Space.sm,
      overflow: 'hidden',
    },
    entry: {
      paddingHorizontal: Space.lg,
      paddingVertical: Space.sm,
      gap: UI_SIZE_2,
    },
    entryMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.sm,
    },
    levelError: { ...levelBase, color: c.error },
    levelWarn: { ...levelBase, color: theme.colors.warning },
    levelInfo: { ...levelBase, color: c.onSurfaceVariant },
    entryTime: {
      fontFamily: FontFamily.mono,
      fontSize: FontSize.caption,
      color: c.onSurfaceVariant,
      flexShrink: 1,
    },
    entryMessage: {
      fontFamily: FontFamily.mono,
      fontSize: FontSize.caption,
      color: c.onSurface,
    },
    entryDetail: {
      fontFamily: FontFamily.mono,
      fontSize: FontSize.caption,
      color: c.onSurfaceVariant,
      marginTop: UI_SIZE_4,
    },
    errorBox: {
      padding: Space.base,
      borderRadius: UI_SIZE_28,
      backgroundColor: hexWithAlpha(c.error || c.primary, 0.12),
      marginBottom: Space.base,
    },
    errorText: {
      fontFamily: FontFamily.mono,
      fontSize: FontSize.caption,
      color: c.onSurface,
    },
    muted: {
      fontFamily: FontFamily.regular,
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
    },
  })
  return styles
}, useErrorLogHooks)
