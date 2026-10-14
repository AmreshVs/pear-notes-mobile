import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { LocalAiProcessing } from '@/components/LocalAiProcessing'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_14,
} from '@/constants/commonStyles'
import {
  formatWorkDetail,
  formatWorkStepLabel,
  getActiveWorkStep,
  type LocalAiWorkProgressProps,
  WORK_PREVIEW_LINE_HEIGHT,
  WORK_PREVIEW_VISIBLE_LINES,
} from '@/lib/localAi/workProgress'

export function LocalAiWorkProgress({ view, languageName }: LocalAiWorkProgressProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const hasFraction = view.fraction !== null
  const fillStyle = useMemo(
    () => ({ width: `${Math.round((view.fraction ?? 0) * 100)}%` as const }),
    [view.fraction],
  )
  const { step, current, total } = getActiveWorkStep(view)
  const label = step ? formatWorkStepLabel(step, t) : ''
  const counter = t('localAi.work.stepCount', { current, total })
  const detail = formatWorkDetail(view, t, languageName)

  return (
    <View style={styles.container}>
      <View
        style={styles.statusRow}
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={t('localAi.work.stepAccessibility', { label, current, total })}
      >
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.statusText} numberOfLines={1}>
          {label}
        </Text>
        {total > 1 && <Text style={styles.counter}>{counter}</Text>}
      </View>

      {hasFraction && (
        <View
          style={styles.track}
          accessibilityRole="progressbar"
          accessibilityLabel={t('localAi.work.progressLabel')}
          accessibilityValue={{ min: 0, max: 100, now: Math.round((view.fraction ?? 0) * 100) }}
        >
          <View style={[styles.fill, fillStyle]} />
        </View>
      )}

      {!!detail && <Text style={styles.detail}>{detail}</Text>}

      {view.preview ? (
        <View style={styles.previewCard} accessibilityLabel={t('localAi.work.previewLabel')}>
          <View style={styles.previewWindow}>
            <Text style={styles.previewText}>{view.preview}</Text>
          </View>
        </View>
      ) : (
        <LocalAiProcessing color={colors.primary} captionColor={colors.textSecondary} />
      )}
    </View>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      gap: UI_SIZE_12,
      paddingVertical: UI_SIZE_4,
    },
    statusRow: {
      ...commonStyles.row,
      gap: UI_SIZE_10,
    },
    statusText: {
      ...commonStyles.flex1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    counter: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.medium,
      color: theme.colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    track: {
      height: UI_SIZE_4,
      borderRadius: UI_SIZE_2,
      overflow: 'hidden',
      backgroundColor: theme.colors.borderSecondary,
    },
    fill: {
      height: '100%',
      borderRadius: UI_SIZE_2,
      backgroundColor: theme.colors.primary,
    },
    detail: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.medium,
      color: theme.colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    previewCard: {
      padding: UI_SIZE_14,
      borderRadius: Radii.card,
      borderCurve: 'continuous',
      backgroundColor: theme.colors.cardSurface,
    },
    previewWindow: {
      maxHeight: WORK_PREVIEW_LINE_HEIGHT * WORK_PREVIEW_VISIBLE_LINES,
      overflow: 'hidden',
      justifyContent: 'flex-end',
    },
    previewText: {
      fontSize: FontSize.subtitle,
      lineHeight: WORK_PREVIEW_LINE_HEIGHT,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
    },
  })
  return styles
})
