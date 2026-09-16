import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import { useRewriteChanges } from '@/components/useRewriteChanges'
import Colors from '@/constants/Colors'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_18,
  UI_ICON_SIZE_20,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_28,
  UI_SIZE_40,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import {
  describeRewriteParagraph,
  REWRITE_SEGMENT,
  REWRITE_VIEWS,
  type RewriteChangesProps,
  type RewriteItem,
  type RewriteSegment,
  type RewriteView,
} from '@/lib/localAi/rewriteChanges'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  onSurfaceVariant?: string
}

export function RewriteChanges({ diff, resultText, showFixCount, maxHeight }: RewriteChangesProps) {
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
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
          android_ripple={androidRipple(hexWithAlpha(c.onSurface, 0.08))}
          style={styles.unchangedRow}
        >
          <MaterialCommunityIcons
            name="unfold-more-horizontal"
            size={UI_ICON_SIZE_18}
            color={c.onSurfaceVariant}
          />
          <Text style={styles.unchangedText}>
            {t('localAi.rewriteChanges.unchangedParagraphs', { count: item.paragraphs.length })}
          </Text>
        </Pressable>
      ),
    [c.onSurface, c.onSurfaceVariant, handleShowUnchanged, renderSegment, styles, t],
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
          style={[styles.segItem, active && styles.segItemActive]}
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
          <MaterialCommunityIcons
            name="check"
            size={UI_ICON_SIZE_20}
            color={styles.segmentAdded.color}
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
        style={styles.segContainer}
        accessibilityRole="tablist"
        accessibilityLabel={t('localAi.rewriteChanges.viewLabel')}
      >
        {REWRITE_VIEWS.map(renderViewOption)}
      </View>

      {showBanner && (
        <View style={styles.banner}>
          <MaterialCommunityIcons
            name="information-outline"
            size={UI_ICON_SIZE_20}
            color={c.onSurfaceVariant}
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

const useStyles = createThemedStylesheetWithHooks((theme, md3Theme) => {
  const c = md3Theme.colors as ExtendedColors
  const diffColors = theme.isDark ? Colors.dark : Colors.light
  const countBase = {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.semiBold,
    fontWeight: FontWeight.semibold,
  }
  const styles = StyleSheet.create({
    segContainer: {
      ...commonStyles.row,
      backgroundColor: hexWithAlpha(c.onSurface, 0.04),
      borderRadius: UI_SIZE_9999,
      padding: UI_SIZE_4,
    },
    segItem: {
      ...commonStyles.flex1,
      ...commonStyles.centered,
      paddingVertical: UI_SIZE_12,
      borderRadius: UI_SIZE_9999,
    },
    segItemActive: {
      backgroundColor: c.primaryContainer,
    },
    segText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurfaceVariant,
    },
    segTextActive: {
      color: c.onPrimaryContainer,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
    },
    banner: {
      ...commonStyles.row,
      gap: UI_SIZE_12,
      padding: UI_SIZE_16,
      borderRadius: UI_SIZE_20,
      backgroundColor: hexWithAlpha(c.onSurface, 0.06),
    },
    bannerText: {
      ...commonStyles.flex1,
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    previewCard: {
      borderRadius: UI_SIZE_20,
      backgroundColor: c.surfaceContainerHigh ?? theme.colors.cardSurface,
    },
    previewContent: {
      padding: UI_SIZE_16,
      gap: UI_SIZE_8,
    },
    previewText: {
      fontSize: FontSize.subtitle,
      lineHeight: 24,
      fontFamily: FontFamily.regular,
      color: c.onSurface,
    },
    segmentEqual: {
      color: c.onSurface,
    },
    segmentRemoved: {
      color: diffColors.diffRemoveText,
      backgroundColor: diffColors.diffRemoveBackground,
      textDecorationLine: 'line-through',
    },
    segmentAdded: {
      color: diffColors.diffAddText,
      backgroundColor: diffColors.diffAddBackground,
      textDecorationLine: 'underline',
    },
    unchangedRow: {
      ...commonStyles.row,
      justifyContent: 'center',
      gap: UI_SIZE_8,
      paddingVertical: UI_SIZE_8,
      borderRadius: UI_SIZE_9999,
      overflow: 'hidden',
      backgroundColor: hexWithAlpha(c.onSurface, 0.06),
    },
    unchangedText: {
      ...countBase,
      color: c.onSurfaceVariant,
    },
    countRow: {
      ...commonStyles.row,
      gap: UI_SIZE_8,
    },
    countText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    addedCount: {
      ...countBase,
      color: diffColors.diffAddText,
    },
    removedCount: {
      ...countBase,
      color: diffColors.diffRemoveText,
    },
    emptyCard: {
      ...commonStyles.centered,
      gap: UI_SIZE_12,
      paddingVertical: UI_SIZE_28,
      paddingHorizontal: UI_SIZE_16,
      borderRadius: UI_SIZE_20,
      backgroundColor: c.surfaceContainerHigh ?? theme.colors.cardSurface,
    },
    emptyIcon: {
      ...commonStyles.centered,
      width: UI_SIZE_40,
      height: UI_SIZE_40,
      borderRadius: UI_SIZE_9999,
      backgroundColor: diffColors.diffAddBackground,
    },
    emptyText: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurface,
      textAlign: 'center',
    },
  })
  return styles
}, useMD3Theme)
