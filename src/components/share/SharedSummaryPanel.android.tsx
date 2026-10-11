import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import type { MD3Theme } from 'react-native-paper'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import type { ShareSummaryModel } from '@/components/share/useShareSummary'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import {
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_18,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_20,
  UI_SIZE_40,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'

type ExtendedColors = MD3Theme['colors'] & {
  surfaceContainerHighest?: string
}

const COLLAPSED_SUMMARY_LINES = 2

type SharedSummaryPanelProps = {
  model: ShareSummaryModel
  isNoteOpen: boolean
}

export function SharedSummaryPanel({ model, isNoteOpen }: SharedSummaryPanelProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])

  const renderKeyPoint = useCallback(
    (point: string, index: number) => (
      <View key={`${index}-${point}`} style={styles.pointRow}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.pointText}>{point}</Text>
      </View>
    ),
    [styles],
  )

  if (model.status === 'idle') {
    if (!model.canSummarize) return null
    return (
      <Pressable
        onPress={model.handleSummarize}
        android_ripple={ripple}
        accessibilityRole="button"
        style={styles.row}
      >
        <MaterialCommunityIcons name="creation" size={UI_ICON_SIZE_18} color={c.primary} />
        <Text style={styles.actionLabel}>{t('shareIntake.summary.summarize')}</Text>
      </Pressable>
    )
  }

  if (model.status === 'working') {
    return (
      <View style={styles.row} accessibilityLiveRegion="polite">
        <ActivityIndicator size="small" color={c.primary} />
        <Text style={styles.caption}>{t('shareIntake.summary.working')}</Text>
      </View>
    )
  }

  if (model.status === 'failed') {
    return (
      <Pressable
        onPress={model.handleSummarize}
        android_ripple={ripple}
        accessibilityRole="button"
        style={styles.row}
      >
        <Text style={styles.caption}>{t('shareIntake.summary.failed')}</Text>
      </Pressable>
    )
  }

  return (
    <View style={styles.panel}>
      <Pressable
        onPress={model.handleToggleExpanded}
        android_ripple={ripple}
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
          android_ripple={ripple}
          accessibilityRole="button"
          accessibilityLabel={t('shareIntake.summary.openFolder', { folder: model.folder.name })}
          style={styles.row}
        >
          <MaterialCommunityIcons name="folder-outline" size={UI_ICON_SIZE_18} color={c.primary} />
          <Text style={styles.actionLabel} numberOfLines={1}>
            {t('shareIntake.summary.suggestedFolder', { folder: model.folder.name })}
          </Text>
        </Pressable>
      ) : null}
      {isNoteOpen ? (
        <Text style={styles.caption}>{t('shareIntake.summary.includeSummary')}</Text>
      ) : null}
    </View>
  )
}

const useSummaryHooks = () => {
  const md3 = useMD3Theme()
  return { md3 }
}

const useStyles = createThemedStylesheetWithHooks((_theme, { md3 }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    panel: {
      gap: UI_SIZE_8,
      padding: UI_SIZE_12,
      borderRadius: UI_SIZE_20,
      backgroundColor: c.surfaceContainerHighest ?? c.surface,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_8,
      minHeight: UI_SIZE_40,
    },
    pointRow: {
      flexDirection: 'row',
      gap: UI_SIZE_8,
    },
    bullet: {
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
    },
    pointText: {
      flex: 1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurface,
    },
    summaryText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurface,
      paddingBottom: UI_SIZE_4,
    },
    actionLabel: {
      flexShrink: 1,
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.primary,
    },
    caption: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
  })
  return styles
}, useSummaryHooks)
