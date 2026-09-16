import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { LocalAiProcessing } from '@/components/LocalAiProcessing'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'
import {
  formatWorkDetail,
  formatWorkStepLabel,
  getActiveWorkStep,
  type LocalAiWorkProgressProps,
} from '@/lib/localAi/workProgress'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  onSurfaceVariant?: string
}

export function LocalAiWorkProgress({ view, languageName }: LocalAiWorkProgressProps) {
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
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
        <ActivityIndicator size="small" color={c.primary} />
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
          <Text style={styles.previewText}>{view.preview}</Text>
        </View>
      ) : (
        <LocalAiProcessing color={c.primary} captionColor={c.onSurfaceVariant ?? c.onSurface} />
      )}
    </View>
  )
}

const useStyles = createThemedStylesheetWithHooks((theme, md3Theme) => {
  const c = md3Theme.colors as ExtendedColors
  const styles = StyleSheet.create({
    container: {
      gap: UI_SIZE_12,
      paddingVertical: UI_SIZE_4,
    },
    statusRow: {
      ...commonStyles.row,
      gap: UI_SIZE_12,
    },
    statusText: {
      ...commonStyles.flex1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurface,
    },
    counter: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.medium,
      color: c.onSurfaceVariant,
      fontVariant: ['tabular-nums'],
    },
    track: {
      height: UI_SIZE_4,
      borderRadius: UI_SIZE_2,
      overflow: 'hidden',
      backgroundColor: hexWithAlpha(c.onSurface, 0.12),
    },
    fill: {
      height: '100%',
      borderRadius: UI_SIZE_2,
      backgroundColor: c.primary,
    },
    detail: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.medium,
      color: c.onSurfaceVariant,
      fontVariant: ['tabular-nums'],
    },
    previewCard: {
      padding: UI_SIZE_16,
      borderRadius: UI_SIZE_20,
      backgroundColor: c.surfaceContainerHigh ?? theme.colors.cardSurface,
    },
    previewText: {
      fontSize: FontSize.subtitle,
      lineHeight: 24,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
  })
  return styles
}, useMD3Theme)
