import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, ScrollView, StyleSheet, View as RNView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Layout,
  Radii,
  Space,
  UI_ICON_SIZE_12,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_6,
} from '@/constants/commonStyles'

import type { MergeColumn, MergeLine } from './mergePreviewTypes'
import { MERGE_LINE_KIND, useMergePreview } from './useMergePreview'

export function MergePreviewModal() {
  const { t } = useTranslation()
  const styles = useStyles()
  const { colors } = useTheme()
  const { visible, ready, loading, title, description, columns, dropped, errorText, close, merge } =
    useMergePreview()

  const markers = useMemo<Record<string, object>>(
    () => ({
      [MERGE_LINE_KIND.TASK]: styles.taskMarker,
      [MERGE_LINE_KIND.BULLET]: styles.bulletMarker,
      [MERGE_LINE_KIND.NUMBER]: styles.bulletMarker,
    }),
    [styles.taskMarker, styles.bulletMarker],
  )

  const renderLine = useCallback(
    (line: MergeLine, index: number) => {
      const marker = markers[line.kind]
      return (
        <RNView key={index} style={styles.line}>
          {marker && <RNView style={marker} />}
          {line.kind === MERGE_LINE_KIND.ATTACHMENT ? (
            <RNView style={styles.attachment}>
              <SymbolIcon name="paperclip" size={UI_ICON_SIZE_12} color={colors.textMuted} />
              <Text style={styles.lineMuted}>{t('mergePreview.attachment')}</Text>
            </RNView>
          ) : (
            <Text
              style={[
                line.kind === MERGE_LINE_KIND.HEADING ? styles.lineHeading : styles.lineText,
                line.added && styles.lineAdded,
                line.checked && styles.lineChecked,
              ]}
            >
              {line.text}
            </Text>
          )}
        </RNView>
      )
    },
    [styles, markers, colors.textMuted, t],
  )

  const renderDropped = useCallback(
    (line: { text: string }, index: number) => (
      <Text key={index} style={styles.droppedLine}>
        {line.text}
      </Text>
    ),
    [styles.droppedLine],
  )

  const renderColumn = useCallback(
    (column: MergeColumn) => (
      <RNView key={column.id} style={[styles.card, column.result && styles.resultCard]}>
        <Text style={column.result ? styles.resultLabel : styles.cardLabel} numberOfLines={1}>
          {column.label}
        </Text>
        <Text style={styles.cardTitle}>{column.title}</Text>
        {column.lines.map(renderLine)}
        {column.result && dropped.length > 0 && (
          <RNView style={styles.dropped}>
            <Text style={styles.droppedLabel}>
              {t('mergePreview.dropped', { count: dropped.length })}
            </Text>
            {dropped.map(renderDropped)}
          </RNView>
        )}
      </RNView>
    ),
    [styles, renderLine, renderDropped, dropped, t],
  )

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
    >
      <RNView style={styles.root}>
        <RNView style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </RNView>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {loading && <Text style={styles.status}>{t('mergePreview.loading')}</Text>}
          {errorText && (
            <Text style={styles.error} accessibilityRole="alert">
              {errorText}
            </Text>
          )}
          {columns.map(renderColumn)}
          <RNView style={styles.undoRow}>
            <SymbolIcon
              name="arrow.uturn.backward"
              size={UI_ICON_SIZE_12}
              color={colors.textMuted}
            />
            <Text style={styles.lineMuted}>{t('mergePreview.undoHint')}</Text>
          </RNView>
        </ScrollView>
        <RNView style={styles.actions}>
          <Pressable
            onPress={close}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.button,
              styles.cancelButton,
              pressed && commonStyles.pressed,
            ]}
          >
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
          <Pressable
            onPress={merge}
            disabled={!ready}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.button,
              styles.mergeButton,
              !ready && commonStyles.disabled,
              pressed && commonStyles.pressed,
            ]}
          >
            <Text style={styles.mergeText}>{t('notesList.merge.action')}</Text>
          </Pressable>
        </RNView>
      </RNView>
    </Modal>
  )
}

const useMergeHooks = () => {
  const insets = useSafeAreaInsets()
  return { insets }
}

const useStyles = createThemedStylesheetWithHooks((theme, { insets }) => {
  const lineBase = {
    fontSize: FontSize.body,
    fontFamily: FontFamily.regular,
    lineHeight: FontSize.body * 1.45,
    color: theme.colors.textSecondary,
    flexShrink: 1,
  }
  const styles = StyleSheet.create({
    root: {
      ...commonStyles.flex1,
      backgroundColor: theme.colors.background,
    },
    header: {
      gap: Space.xs,
      paddingTop: Space.xl,
      paddingHorizontal: Space.lg,
      paddingBottom: Space.md,
    },
    title: {
      fontSize: FontSize.title,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
    },
    description: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      lineHeight: FontSize.body * 1.4,
      color: theme.colors.textMuted,
    },
    scrollContent: {
      gap: Space.md,
      paddingHorizontal: Space.base,
      paddingBottom: Space.xl,
    },
    status: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
      textAlign: 'center',
      paddingVertical: Space.xxl,
    },
    error: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.error,
      textAlign: 'center',
      paddingVertical: Space.xxl,
    },
    card: {
      gap: UI_SIZE_6,
      padding: Space.base,
      borderRadius: Radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.borderSecondary,
      backgroundColor: theme.colors.cardSurface,
    },
    resultCard: {
      borderColor: theme.colors.cardSelectedBorder,
      backgroundColor: theme.colors.cardSelected,
    },
    cardLabel: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.textMuted,
    },
    resultLabel: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.primary,
    },
    cardTitle: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
    },
    line: {
      ...commonStyles.row,
      alignItems: 'flex-start',
      gap: Space.sm,
    },
    bulletMarker: {
      width: UI_SIZE_6,
      height: UI_SIZE_6,
      marginTop: Space.sm,
      borderRadius: Radii.pill,
      backgroundColor: theme.colors.textMuted,
    },
    taskMarker: {
      width: Space.md,
      height: Space.md,
      marginTop: UI_SIZE_4,
      borderRadius: UI_SIZE_4,
      borderWidth: UI_SIZE_2,
      borderColor: theme.colors.textMuted,
    },
    lineText: lineBase,
    lineHeading: {
      ...lineBase,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
    },
    lineAdded: {
      color: theme.colors.diffAddText,
      backgroundColor: theme.colors.diffAddBackground,
    },
    lineChecked: {
      textDecorationLine: 'line-through',
    },
    lineMuted: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
    },
    attachment: {
      ...commonStyles.row,
      gap: UI_SIZE_4,
    },
    dropped: {
      gap: UI_SIZE_2,
      paddingTop: UI_SIZE_4,
    },
    droppedLabel: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
    },
    droppedLine: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
      textDecorationLine: 'line-through',
    },
    undoRow: {
      ...commonStyles.row,
      gap: UI_SIZE_6,
      paddingHorizontal: Space.xs,
    },
    actions: {
      ...commonStyles.row,
      gap: Space.md,
      paddingHorizontal: Space.base,
      paddingTop: Space.md,
      paddingBottom: insets.bottom + Space.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.separator,
    },
    button: {
      ...commonStyles.flex1,
      ...commonStyles.centered,
      height: Layout.btnHeight,
      borderRadius: Radii.btn,
    },
    cancelButton: {
      backgroundColor: theme.colors.cardSurface,
    },
    mergeButton: {
      backgroundColor: theme.colors.primary,
    },
    cancelText: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    mergeText: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.onPrimary,
    },
  })
  return styles
}, useMergeHooks)
