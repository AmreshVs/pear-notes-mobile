import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, View as RNView } from 'react-native'

import { diffActivityText } from '@pear-notes/core/activity.js'

import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_14,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_18,
  UI_SIZE_32,
} from '@/constants/commonStyles'

import { useCopyRemovedLines } from './useCopyRemovedLines'

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
  const { colors } = useTheme()

  const diff = useMemo(() => diffActivityText(before || '', after || ''), [before, after])
  const { canCopy, copied, copyRemoved } = useCopyRemovedLines(diff.rows)

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
        {canCopy ? (
          <Pressable
            onPress={copyRemoved}
            hitSlop={UI_SIZE_8}
            accessibilityRole="button"
            accessibilityLabel={t('activity.diff.copyRemoved')}
            style={({ pressed }) => [styles.copyBtn, pressed && commonStyles.pressed]}
          >
            <SymbolIcon
              name={copied ? 'checkmark' : 'doc.on.doc'}
              size={UI_ICON_SIZE_14}
              color={copied ? colors.success : colors.textMuted}
            />
          </Pressable>
        ) : null}
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
      borderColor: theme.colors.borderSecondary,
      backgroundColor: theme.colors.background,
      overflow: 'hidden',
    },
    header: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.md,
      paddingHorizontal: Space.md,
      paddingVertical: Space.sm,
      borderBottomColor: theme.colors.border,
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
    copyBtn: {
      ...commonStyles.centered,
      width: UI_SIZE_18,
      height: UI_SIZE_18,
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
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: Space.md,
      paddingVertical: Space.sm,
      borderTopColor: theme.colors.border,
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
