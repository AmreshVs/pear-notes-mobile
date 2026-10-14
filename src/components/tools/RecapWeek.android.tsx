import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import { recapBars } from '@/components/tools/recapBars'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_SIZE_8,
  UI_SIZE_16,
  UI_SIZE_18,
  UI_SIZE_24,
} from '@/constants/commonStyles'
import type { Recap } from '@/hooks/useRecap'
import { hexWithAlpha } from '@/lib/backupUtils'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
}

export const RecapWeek = memo(function RecapWeek({ recap }: { recap: Recap }) {
  const { t, i18n } = useTranslation()
  const styles = useStyles()
  const bars = useMemo(() => recapBars(recap, i18n.language), [recap, i18n.language])

  return (
    <View style={styles.card}>
      <View style={styles.totalRow}>
        <Text style={styles.total}>{recap.editedCount}</Text>
        <Text style={styles.totalLabel}>
          {t('recap.notesEdited', { count: recap.editedCount })}
        </Text>
      </View>
      <View style={styles.bars}>
        {bars.map((bar) => (
          <View
            key={bar.start}
            style={styles.barColumn}
            accessible
            accessibilityLabel={t('recap.dayBar', { day: bar.dayName, count: bar.count })}
          >
            <View
              style={[
                styles.bar,
                { height: bar.height },
                bar.count === 0
                  ? styles.barEmpty
                  : bar.isToday
                    ? styles.barToday
                    : styles.barFilled,
              ]}
            />
            <Text style={[styles.dayLetter, bar.isToday && styles.dayLetterToday]}>
              {bar.letter}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
})

const useStyles = createThemedStylesheetWithHooks((_theme, md3) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    card: {
      gap: UI_SIZE_16,
      padding: UI_SIZE_18,
      marginBottom: UI_SIZE_24,
      borderRadius: UI_SIZE_24,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
    },
    totalRow: {
      ...commonStyles.row,
      alignItems: 'baseline',
      gap: UI_SIZE_8,
    },
    total: {
      fontSize: FontSize.hero,
      fontFamily: FontFamily.extraBold,
      fontWeight: FontWeight.heavy,
      letterSpacing: -0.5,
      color: c.onSurface,
      fontVariant: ['tabular-nums'],
    },
    totalLabel: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurfaceVariant,
    },
    bars: {
      ...commonStyles.row,
      alignItems: 'flex-end',
      gap: UI_SIZE_8,
    },
    barColumn: {
      ...commonStyles.flex1,
      alignItems: 'center',
      gap: UI_SIZE_8,
    },
    bar: {
      alignSelf: 'stretch',
      borderRadius: UI_SIZE_8,
    },
    barEmpty: {
      backgroundColor: hexWithAlpha(c.outlineVariant, 0.3),
    },
    barFilled: {
      backgroundColor: hexWithAlpha(c.primary, 0.4),
    },
    barToday: {
      backgroundColor: c.primary,
    },
    dayLetter: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurfaceVariant,
    },
    dayLetterToday: {
      fontFamily: FontFamily.extraBold,
      fontWeight: FontWeight.heavy,
      color: c.primary,
    },
  })
  return styles
}, useMD3Theme)
