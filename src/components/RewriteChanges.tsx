import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import { useRewriteChanges } from '@/components/useRewriteChanges'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_20,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_28,
  UI_SIZE_40,
} from '@/constants/commonStyles'
import {
  describeRewriteParagraph,
  REWRITE_SEGMENT,
  REWRITE_VIEWS,
  type RewriteChangesProps,
  type RewriteItem,
  type RewriteSegment,
  type RewriteView,
} from '@/lib/localAi/rewriteChanges'

export function RewriteChanges({ diff, resultText, showFixCount, maxHeight }: RewriteChangesProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const { view, setView, items, handleShowUnchanged, showBanner } = useRewriteChanges(diff)
  const cardHeightStyle = useMemo(() => ({ maxHeight }), [maxHeight])
  const segmentStyles = useMemo(
    () => ({
      [REWRITE_SEGMENT.EQUAL]: styles.segmentEqual,
      [REWRITE_SEGMENT.REMOVED]: styles.segmentRemoved,
      [REWRITE_SEGMENT.ADDED]: styles.segmentAdded,
    }),
    [styles],
  )

  const renderSegment = useCallback(
    (segment: RewriteSegment, index: number) => (
      <Text key={index} style={segmentStyles[segment.type]}>
        {index > 0 ? ' ' : ''}
        {segment.text}
      </Text>
    ),
    [segmentStyles],
  )

  const renderItem = useCallback(
    (item: RewriteItem, index: number) =>
      item.type === 'paragraph' ? (
        <Text
          key={`paragraph-${index}`}
          style={styles.previewText}
          accessibilityLabel={
            item.paragraph.changed ? describeRewriteParagraph(item.paragraph, t) : undefined
          }
          selectable
        >
          {item.paragraph.segments.map(renderSegment)}
        </Text>
      ) : (
        <Pressable
          key={`unchanged-${index}`}
          onPress={handleShowUnchanged}
          accessibilityRole="button"
          accessibilityHint={t('localAi.rewriteChanges.showUnchangedHint')}
          style={({ pressed }) => [styles.unchangedRow, pressed && commonStyles.pressed]}
        >
          <Text style={styles.unchangedText}>
            {t('localAi.rewriteChanges.unchangedParagraphs', { count: item.paragraphs.length })}
          </Text>
        </Pressable>
      ),
    [handleShowUnchanged, renderSegment, styles, t],
  )

  const renderViewOption = useCallback(
    (item: RewriteView) => {
      const active = item === view
      return (
        <Pressable
          key={item}
          onPress={() => setView(item)}
          accessibilityRole="tab"
          accessibilityState={{ selected: active }}
          style={[styles.segPill, active && styles.segPillActive]}
        >
          <Text style={[styles.segText, active && styles.segTextActive]}>
            {t(`localAi.rewriteChanges.${item}`)}
          </Text>
        </Pressable>
      )
    },
    [setView, styles, t, view],
  )

  if (diff.unchanged) {
    return (
      <View style={styles.emptyCard}>
        <View style={styles.emptyIcon}>
          <SymbolView
            name="checkmark"
            size={UI_ICON_SIZE_20}
            tintColor={colors.diffAddText}
            weight="bold"
          />
        </View>
        <Text style={styles.emptyText}>
          {t(
            showFixCount
              ? 'localAi.rewriteChanges.noGrammarIssues'
              : 'localAi.rewriteChanges.matchesText',
          )}
        </Text>
      </View>
    )
  }

  return (
    <>
      <View
        style={styles.segCtrl}
        accessibilityRole="tablist"
        accessibilityLabel={t('localAi.rewriteChanges.viewLabel')}
      >
        {REWRITE_VIEWS.map(renderViewOption)}
      </View>

      {showBanner && (
        <View style={styles.banner}>
          <SymbolView
            name="info.circle"
            size={UI_ICON_SIZE_16}
            tintColor={colors.textSecondary}
            weight="semibold"
          />
          <Text style={styles.bannerText}>{t('localAi.rewriteChanges.mostlyChanged')}</Text>
        </View>
      )}

      <ScrollView
        style={[styles.previewCard, cardHeightStyle]}
        contentContainerStyle={styles.previewContent}
      >
        {view === 'result' ? (
          <Text style={styles.previewText} selectable>
            {resultText}
          </Text>
        ) : (
          items.map(renderItem)
        )}
      </ScrollView>

      {showFixCount ? (
        <Text style={styles.countText}>
          {t('localAi.rewriteChanges.fixes', { count: diff.fixes })}
        </Text>
      ) : (
        <View
          style={styles.countRow}
          accessible
          accessibilityLabel={t('localAi.rewriteChanges.wordCountLabel', {
            added: diff.added,
            removed: diff.removed,
          })}
        >
          <Text style={styles.addedCount}>+{diff.added}</Text>
          <Text style={styles.removedCount}>&minus;{diff.removed}</Text>
          <Text style={styles.countText}>{t('localAi.rewriteChanges.words')}</Text>
        </View>
      )}
    </>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const countBase = {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.semiBold,
    fontWeight: FontWeight.semibold,
  }
  const styles = StyleSheet.create({
    segCtrl: {
      ...commonStyles.row,
      borderRadius: UI_SIZE_12,
      padding: UI_SIZE_4,
      backgroundColor: theme.colors.controlBackground,
    },
    segPill: {
      ...commonStyles.flex1,
      ...commonStyles.centered,
      paddingVertical: UI_SIZE_8,
      borderRadius: UI_SIZE_10,
      borderCurve: 'continuous',
    },
    segPillActive: {
      backgroundColor: theme.colors.primary,
    },
    segText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: theme.colors.textMuted,
    },
    segTextActive: {
      color: theme.colors.onPrimary,
    },
    banner: {
      ...commonStyles.row,
      gap: UI_SIZE_8,
      paddingHorizontal: UI_SIZE_12,
      paddingVertical: UI_SIZE_10,
      borderRadius: UI_SIZE_12,
      borderCurve: 'continuous',
      backgroundColor: theme.colors.controlBackground,
    },
    bannerText: {
      ...commonStyles.flex1,
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.textSecondary,
    },
    previewCard: {
      borderRadius: Radii.card,
      borderCurve: 'continuous',
      backgroundColor: theme.colors.cardSurface,
    },
    previewContent: {
      padding: UI_SIZE_14,
      gap: UI_SIZE_8,
    },
    previewText: {
      fontSize: FontSize.subtitle,
      lineHeight: 24,
      fontFamily: FontFamily.regular,
      color: theme.colors.text,
    },
    segmentEqual: {
      color: theme.colors.text,
    },
    segmentRemoved: {
      color: theme.colors.diffRemoveText,
      backgroundColor: theme.colors.diffRemoveBackground,
      textDecorationLine: 'line-through',
    },
    segmentAdded: {
      color: theme.colors.diffAddText,
      backgroundColor: theme.colors.diffAddBackground,
      textDecorationLine: 'underline',
    },
    unchangedRow: {
      ...commonStyles.centered,
      paddingVertical: UI_SIZE_8,
      borderRadius: UI_SIZE_8,
      borderCurve: 'continuous',
      backgroundColor: theme.colors.controlBackground,
    },
    unchangedText: {
      ...countBase,
      color: theme.colors.textSecondary,
    },
    countRow: {
      ...commonStyles.row,
      gap: UI_SIZE_8,
    },
    countText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
    },
    addedCount: {
      ...countBase,
      color: theme.colors.diffAddText,
    },
    removedCount: {
      ...countBase,
      color: theme.colors.diffRemoveText,
    },
    emptyCard: {
      ...commonStyles.centered,
      gap: UI_SIZE_8,
      paddingVertical: UI_SIZE_28,
      paddingHorizontal: UI_SIZE_14,
      borderRadius: Radii.card,
      borderCurve: 'continuous',
      backgroundColor: theme.colors.cardSurface,
    },
    emptyIcon: {
      ...commonStyles.centered,
      width: UI_SIZE_40,
      height: UI_SIZE_40,
      borderRadius: UI_SIZE_40,
      backgroundColor: theme.colors.diffAddBackground,
    },
    emptyText: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
      textAlign: 'center',
    },
  })
  return styles
})
