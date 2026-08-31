import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'

import { diffActivityText } from '@pear-notes/core/activity.js'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import Colors from '@/constants/Colors'
import {
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_SIZE_4,
  UI_SIZE_16,
  UI_SIZE_18,
  UI_SIZE_32,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

type DiffRow = {
  type: string
  text: string
  before: number | null
  after: number | null
  count?: number
}

type Props = {
  before: string
  after: string
}

export function ActivityDiff({ before, after }: Props) {
  const { t } = useTranslation()
  const styles = useStyles()

  const diff = useMemo(() => diffActivityText(before || '', after || ''), [before, after])

  const renderRow = useCallback(
    (row: DiffRow, index: number) => {
      if (row.type === 'gap') {
        return (
          <View key={`gap-${index}`} style={styles.gapRow}>
            <Text style={styles.gapText}>
              {t('activity.diff.unchangedLines', { count: row.count })}
            </Text>
          </View>
        )
      }

      const rowStyle =
        row.type === 'add' ? styles.addRow : row.type === 'del' ? styles.delRow : styles.ctxRow
      const textStyle =
        row.type === 'add' ? styles.addText : row.type === 'del' ? styles.delText : styles.ctxText
      const marker = row.type === 'add' ? '+' : row.type === 'del' ? '-' : ' '

      return (
        <View key={`${row.type}-${index}`} style={rowStyle}>
          <Text style={styles.lineNumber}>{row.before ?? ''}</Text>
          <Text style={styles.marker}>{marker}</Text>
          <Text style={textStyle}>{row.text || ' '}</Text>
        </View>
      )
    },
    [styles, t],
  )

  if (diff.unchanged) {
    return (
      <View style={styles.notice}>
        <Text style={styles.noticeText}>{t('activity.diff.formattingOnly')}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.added}>+{diff.added}</Text>
        <Text style={styles.removed}>&minus;{diff.removed}</Text>
        <Text style={styles.headerLabel}>{t('activity.diff.plainText')}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.rows}>{diff.rows.map(renderRow)}</View>
      </ScrollView>

      {diff.truncated ? (
        <View style={styles.footer}>
          <Text style={styles.gapText}>{t('activity.diff.truncated')}</Text>
        </View>
      ) : null}
    </View>
  )
}

const useDiffHooks = () => {
  const md3 = useMD3Theme()
  return { md3 }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3 }) => {
  const c = md3.colors
  const diffColors = theme.isDark ? Colors.dark : Colors.light

  const lineBase = {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.caption,
    lineHeight: FontSize.caption * 1.6,
  }
  const rowBase = {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    paddingHorizontal: Space.sm,
  }

  const styles = StyleSheet.create({
    container: {
      marginTop: Space.md,
      borderRadius: UI_SIZE_16,
      backgroundColor: hexWithAlpha(c.onSurface, 0.04),
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.md,
      paddingHorizontal: Space.md,
      paddingVertical: Space.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: hexWithAlpha(c.onSurface, 0.12),
    },
    added: {
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      fontSize: FontSize.caption,
      color: diffColors.diffAddText,
    },
    removed: {
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      fontSize: FontSize.caption,
      color: diffColors.diffRemoveText,
    },
    headerLabel: {
      marginLeft: 'auto',
      fontFamily: FontFamily.medium,
      fontSize: FontSize.caption,
      color: c.onSurfaceVariant,
    },
    rows: {
      paddingVertical: UI_SIZE_4,
      minWidth: '100%',
    },
    ctxRow: rowBase,
    addRow: {
      ...rowBase,
      backgroundColor: diffColors.diffAddBackground,
    },
    delRow: {
      ...rowBase,
      backgroundColor: diffColors.diffRemoveBackground,
    },
    lineNumber: {
      ...lineBase,
      width: UI_SIZE_32,
      textAlign: 'right',
      color: c.onSurfaceVariant,
    },
    marker: {
      ...lineBase,
      width: UI_SIZE_18,
      textAlign: 'center',
      color: c.onSurfaceVariant,
    },
    ctxText: {
      ...lineBase,
      color: c.onSurfaceVariant,
    },
    addText: {
      ...lineBase,
      color: diffColors.diffAddText,
    },
    delText: {
      ...lineBase,
      color: diffColors.diffRemoveText,
    },
    gapRow: {
      paddingHorizontal: Space.sm,
      paddingVertical: UI_SIZE_4,
    },
    gapText: {
      fontFamily: FontFamily.regular,
      fontSize: FontSize.caption,
      color: c.onSurfaceVariant,
    },
    footer: {
      paddingHorizontal: Space.md,
      paddingVertical: Space.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: hexWithAlpha(c.onSurface, 0.12),
    },
    notice: {
      marginTop: Space.md,
      padding: Space.md,
      borderRadius: UI_SIZE_16,
      backgroundColor: hexWithAlpha(c.onSurface, 0.06),
    },
    noticeText: {
      fontFamily: FontFamily.regular,
      fontSize: FontSize.caption,
      color: c.onSurfaceVariant,
    },
  })
  return styles
}, useDiffHooks)
