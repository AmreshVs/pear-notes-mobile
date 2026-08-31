import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View as RNView } from 'react-native'

import { diffActivityText } from '@pear-notes/core/activity.js'

import { createThemedStylesheet, Text } from '@/components/Themed'
import {
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_SIZE_4,
  UI_SIZE_18,
  UI_SIZE_32,
} from '@/constants/commonStyles'

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
          <RNView key={`gap-${index}`} style={styles.gapRow}>
            <Text style={styles.gapText}>
              {t('activity.diff.unchangedLines', { count: row.count })}
            </Text>
          </RNView>
        )
      }

      const rowStyle =
        row.type === 'add' ? styles.addRow : row.type === 'del' ? styles.delRow : styles.ctxRow
      const textStyle =
        row.type === 'add' ? styles.addText : row.type === 'del' ? styles.delText : styles.ctxText
      const marker = row.type === 'add' ? '+' : row.type === 'del' ? '-' : ' '

      return (
        <RNView key={`${row.type}-${index}`} style={rowStyle}>
          <Text style={styles.lineNumber}>{row.before ?? ''}</Text>
          <Text style={styles.marker}>{marker}</Text>
          <Text style={textStyle}>{row.text || ' '}</Text>
        </RNView>
      )
    },
    [styles, t],
  )

  if (diff.unchanged) {
    return (
      <RNView style={styles.notice}>
        <Text style={styles.noticeText}>{t('activity.diff.formattingOnly')}</Text>
      </RNView>
    )
  }

  return (
    <RNView style={styles.container}>
      <RNView style={styles.header}>
        <Text style={styles.added}>+{diff.added}</Text>
        <Text style={styles.removed}>&minus;{diff.removed}</Text>
        <Text style={styles.headerLabel}>{t('activity.diff.plainText')}</Text>
      </RNView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <RNView style={styles.rows}>{diff.rows.map(renderRow)}</RNView>
      </ScrollView>

      {diff.truncated ? (
        <RNView style={styles.footer}>
          <Text style={styles.gapText}>{t('activity.diff.truncated')}</Text>
        </RNView>
      ) : null}
    </RNView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
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
      borderRadius: Radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.borderSecondary,
      backgroundColor: theme.colors.background,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.md,
      paddingHorizontal: Space.md,
      paddingVertical: Space.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.borderSecondary,
    },
    added: {
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      fontSize: FontSize.caption,
      color: theme.colors.diffAddText,
    },
    removed: {
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      fontSize: FontSize.caption,
      color: theme.colors.diffRemoveText,
    },
    headerLabel: {
      marginLeft: 'auto',
      fontFamily: FontFamily.medium,
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
    },
    rows: {
      paddingVertical: UI_SIZE_4,
      minWidth: '100%',
    },
    ctxRow: rowBase,
    addRow: {
      ...rowBase,
      backgroundColor: theme.colors.diffAddBackground,
    },
    delRow: {
      ...rowBase,
      backgroundColor: theme.colors.diffRemoveBackground,
    },
    lineNumber: {
      ...lineBase,
      width: UI_SIZE_32,
      textAlign: 'right',
      color: theme.colors.textMuted,
    },
    marker: {
      ...lineBase,
      width: UI_SIZE_18,
      textAlign: 'center',
      color: theme.colors.textMuted,
    },
    ctxText: {
      ...lineBase,
      color: theme.colors.textMuted,
    },
    addText: {
      ...lineBase,
      color: theme.colors.diffAddText,
    },
    delText: {
      ...lineBase,
      color: theme.colors.diffRemoveText,
    },
    gapRow: {
      paddingHorizontal: Space.sm,
      paddingVertical: UI_SIZE_4,
    },
    gapText: {
      fontFamily: FontFamily.regular,
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
    },
    footer: {
      paddingHorizontal: Space.md,
      paddingVertical: Space.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.borderSecondary,
    },
    notice: {
      marginTop: Space.md,
      padding: Space.md,
      borderRadius: Radii.md,
      backgroundColor: theme.colors.controlBackground,
    },
    noticeText: {
      fontFamily: FontFamily.regular,
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
    },
  })
  return styles
})
