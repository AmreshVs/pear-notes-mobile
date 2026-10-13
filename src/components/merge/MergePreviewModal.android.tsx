import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_12,
  UI_ICON_SIZE_24,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_16,
  UI_SIZE_28,
  UI_SIZE_40,
  UI_SIZE_48,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

import type { MergeColumn, MergeLine } from './mergePreviewTypes'
import { MERGE_LINE_KIND, useMergePreview } from './useMergePreview'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
}

export function MergePreviewModal() {
  const { t } = useTranslation()
  const styles = useStyles()
  const { colors: c } = useMD3Theme()
  const { visible, ready, loading, title, description, columns, dropped, errorText, close, merge } =
    useMergePreview()
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])

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
        <View key={index} style={styles.line}>
          {marker && <View style={marker} />}
          {line.kind === MERGE_LINE_KIND.ATTACHMENT ? (
            <View style={styles.attachment}>
              <MaterialCommunityIcons
                name="paperclip"
                size={UI_ICON_SIZE_12}
                color={c.onSurfaceVariant}
              />
              <Text style={styles.lineMuted}>{t('mergePreview.attachment')}</Text>
            </View>
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
        </View>
      )
    },
    [styles, markers, c.onSurfaceVariant, t],
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
      <View key={column.id} style={[styles.card, column.result && styles.resultCard]}>
        <Text style={column.result ? styles.resultLabel : styles.cardLabel} numberOfLines={1}>
          {column.label}
        </Text>
        <Text style={column.result ? styles.resultTitle : styles.cardTitle}>{column.title}</Text>
        {column.lines.map(renderLine)}
        {column.result && dropped.length > 0 && (
          <View style={styles.dropped}>
            <Text style={styles.droppedLabel}>
              {t('mergePreview.dropped', { count: dropped.length })}
            </Text>
            {dropped.map(renderDropped)}
          </View>
        )}
      </View>
    ),
    [styles, renderLine, renderDropped, dropped, t],
  )

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View style={styles.root}>
        <View style={styles.topBar}>
          <Pressable
            onPress={close}
            android_ripple={ripple}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
            style={styles.closeButton}
          >
            <MaterialCommunityIcons name="close" size={UI_ICON_SIZE_24} color={c.onSurface} />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.description}>{description}</Text>
          {loading && <Text style={styles.status}>{t('mergePreview.loading')}</Text>}
          {errorText && (
            <Text style={styles.error} accessibilityRole="alert">
              {errorText}
            </Text>
          )}
          {columns.map(renderColumn)}
          <View style={styles.undoRow}>
            <MaterialCommunityIcons name="undo" size={UI_ICON_SIZE_12} color={c.onSurfaceVariant} />
            <Text style={styles.lineMuted}>{t('mergePreview.undoHint')}</Text>
          </View>
        </ScrollView>
        <View style={styles.actions}>
          <Pressable
            onPress={close}
            android_ripple={ripple}
            accessibilityRole="button"
            style={[styles.button, styles.cancelButton]}
          >
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
          <Pressable
            onPress={merge}
            disabled={!ready}
            accessibilityRole="button"
            style={[styles.button, styles.mergeButton, !ready && commonStyles.disabled]}
          >
            <Text style={styles.mergeText}>{t('notesList.merge.action')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const useMergeHooks = () => {
  const insets = useSafeAreaInsets()
  const md3 = useMD3Theme()
  return { insets, md3 }
}

const useStyles = createThemedStylesheetWithHooks((_theme, { insets, md3 }) => {
  const c = md3.colors as ExtendedColors
  const lineBase = {
    fontSize: FontSize.body,
    fontFamily: FontFamily.regular,
    lineHeight: FontSize.body * 1.45,
    color: c.onSurfaceVariant,
    flexShrink: 1,
  }
  const labelBase = {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.semiBold,
    fontWeight: FontWeight.semibold,
  }
  const titleBase = {
    fontSize: FontSize.subtitle,
    fontFamily: FontFamily.bold,
    fontWeight: FontWeight.bold,
  }
  const buttonTextBase = {
    fontSize: FontSize.body,
    fontFamily: FontFamily.semiBold,
    fontWeight: FontWeight.semibold,
  }
  const styles = StyleSheet.create({
    root: {
      ...commonStyles.flex1,
      backgroundColor: c.background,
    },
    topBar: {
      ...commonStyles.row,
      gap: Space.sm,
      paddingTop: insets.top + Space.sm,
      paddingHorizontal: Space.sm,
      paddingBottom: Space.sm,
    },
    closeButton: {
      ...commonStyles.centered,
      width: UI_SIZE_48,
      height: UI_SIZE_48,
      borderRadius: UI_SIZE_9999,
    },
    title: {
      ...commonStyles.flex1,
      fontSize: FontSize.title,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onSurface,
    },
    description: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      lineHeight: FontSize.body * 1.4,
      color: c.onSurfaceVariant,
      paddingHorizontal: Space.xs,
    },
    scrollContent: {
      gap: Space.md,
      paddingHorizontal: Space.base,
      paddingBottom: Space.xl,
    },
    status: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      textAlign: 'center',
      paddingVertical: Space.xxl,
    },
    error: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.error,
      textAlign: 'center',
      paddingVertical: Space.xxl,
    },
    card: {
      gap: UI_SIZE_6,
      padding: Space.lg,
      borderRadius: UI_SIZE_28,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
    },
    resultCard: {
      backgroundColor: c.primaryContainer,
    },
    cardLabel: {
      ...labelBase,
      color: c.onSurfaceVariant,
    },
    resultLabel: {
      ...labelBase,
      color: c.onPrimaryContainer,
    },
    cardTitle: {
      ...titleBase,
      color: c.onSurface,
    },
    resultTitle: {
      ...titleBase,
      color: c.onPrimaryContainer,
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
      borderRadius: UI_SIZE_9999,
      backgroundColor: c.onSurfaceVariant,
    },
    taskMarker: {
      width: Space.md,
      height: Space.md,
      marginTop: UI_SIZE_4,
      borderRadius: UI_SIZE_4,
      borderWidth: UI_SIZE_2,
      borderColor: c.onSurfaceVariant,
    },
    lineText: lineBase,
    lineHeading: {
      ...lineBase,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onSurface,
    },
    lineAdded: {
      color: c.onSurface,
      backgroundColor: hexWithAlpha(c.primary, 0.15),
    },
    lineChecked: {
      textDecorationLine: 'line-through',
    },
    lineMuted: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
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
      color: c.onSurfaceVariant,
    },
    droppedLine: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      textDecorationLine: 'line-through',
    },
    undoRow: {
      ...commonStyles.row,
      gap: UI_SIZE_6,
      paddingHorizontal: Space.xs,
    },
    actions: {
      ...commonStyles.row,
      justifyContent: 'flex-end',
      gap: Space.md,
      paddingHorizontal: Space.base,
      paddingTop: Space.md,
      paddingBottom: insets.bottom + Space.md,
    },
    button: {
      ...commonStyles.flex1,
      ...commonStyles.centered,
      height: UI_SIZE_40,
      paddingHorizontal: UI_SIZE_16,
      borderRadius: UI_SIZE_9999,
      overflow: 'hidden',
    },
    cancelButton: {
      backgroundColor: c.secondaryContainer,
    },
    mergeButton: {
      backgroundColor: c.primary,
    },
    cancelText: {
      ...buttonTextBase,
      color: c.onSecondaryContainer,
    },
    mergeText: {
      ...buttonTextBase,
      color: c.onPrimary,
    },
  })
  return styles
}, useMergeHooks)
