import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Pressable,
  PressableStateCallbackType,
  StyleSheet,
  View as RNView,
} from 'react-native'
import { SymbolView } from 'expo-symbols'

import type { ShareSummaryModel } from '@/components/share/useShareSummary'
import { createThemedStylesheet, Text, useColors } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  UI_ICON_SIZE_14,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_36,
} from '@/constants/commonStyles'

const COLLAPSED_SUMMARY_LINES = 2

type SharedSummaryPanelProps = {
  model: ShareSummaryModel
  isNoteOpen: boolean
}

export function SharedSummaryPanel({ model, isNoteOpen }: SharedSummaryPanelProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const colors = useColors()

  const getRowStyle = useCallback(
    ({ pressed }: PressableStateCallbackType) => [styles.row, pressed && commonStyles.pressed],
    [styles.row],
  )

  const renderKeyPoint = useCallback(
    (point: string, index: number) => (
      <RNView key={`${index}-${point}`} style={styles.pointRow}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.pointText}>{point}</Text>
      </RNView>
    ),
    [styles],
  )

  if (model.status === 'idle') {
    if (!model.canSummarize) return null
    return (
      <Pressable onPress={model.handleSummarize} accessibilityRole="button" style={getRowStyle}>
        <SymbolView
          name="sparkles"
          size={UI_ICON_SIZE_14}
          tintColor={colors.primary}
          fallback={<RNView />}
        />
        <Text style={styles.actionLabel}>{t('shareIntake.summary.summarize')}</Text>
      </Pressable>
    )
  }

  if (model.status === 'working') {
    return (
      <RNView style={styles.row}>
        <ActivityIndicator size="small" color={colors.textSecondary} />
        <Text style={styles.caption}>{t('shareIntake.summary.working')}</Text>
      </RNView>
    )
  }

  if (model.status === 'failed') {
    return (
      <Pressable onPress={model.handleSummarize} accessibilityRole="button" style={getRowStyle}>
        <Text style={styles.caption}>{t('shareIntake.summary.failed')}</Text>
      </Pressable>
    )
  }

  return (
    <RNView style={styles.panel}>
      <Pressable
        onPress={model.handleToggleExpanded}
        accessibilityRole="button"
        accessibilityState={{ expanded: model.expanded }}
      >
        <Text
          style={styles.summaryText}
          numberOfLines={model.expanded ? undefined : COLLAPSED_SUMMARY_LINES}
        >
          {model.summary}
        </Text>
      </Pressable>
      {model.expanded ? model.keyPoints.map(renderKeyPoint) : null}
      {model.folder ? (
        <Pressable
          onPress={model.handleOpenFolder}
          accessibilityRole="button"
          accessibilityLabel={t('shareIntake.summary.openFolder', { folder: model.folder.name })}
          style={getRowStyle}
        >
          <SymbolView
            name="folder"
            size={UI_ICON_SIZE_14}
            tintColor={colors.primary}
            fallback={<RNView />}
          />
          <Text style={styles.actionLabel} numberOfLines={1}>
            {t('shareIntake.summary.suggestedFolder', { folder: model.folder.name })}
          </Text>
        </Pressable>
      ) : null}
      {isNoteOpen ? (
        <Text style={styles.caption}>{t('shareIntake.summary.includeSummary')}</Text>
      ) : null}
    </RNView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    panel: {
      gap: UI_SIZE_8,
      padding: UI_SIZE_12,
      borderRadius: Radii.md,
      backgroundColor: theme.colors.surfaceSecondary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_8,
      minHeight: UI_SIZE_36,
    },
    pointRow: {
      flexDirection: 'row',
      gap: UI_SIZE_8,
    },
    bullet: {
      fontSize: FontSize.body,
      color: theme.colors.textSecondary,
    },
    pointText: {
      flex: 1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.text,
    },
    summaryText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.text,
      paddingBottom: UI_SIZE_4,
    },
    actionLabel: {
      flexShrink: 1,
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.primary,
    },
    caption: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.textSecondary,
    },
  })
  return styles
})
