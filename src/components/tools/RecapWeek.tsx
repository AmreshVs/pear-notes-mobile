import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { createThemedStylesheet, Text } from '@/components/Themed'
import { recapBars } from '@/components/tools/recapBars'
import {
  commonStyles,
  FontSize,
  FontWeight,
  LetterSpacing,
  Radii,
  Space,
  UI_SIZE_42,
} from '@/constants/commonStyles'
import type { Recap } from '@/hooks/useRecap'
import { hexWithAlpha } from '@/lib/backupUtils'

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

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    card: {
      gap: Space.base,
      padding: Space.base + 2,
      marginHorizontal: Space.base,
      marginBottom: Space.xl,
      borderRadius: Radii.xl - 4,
      borderCurve: 'continuous',
      backgroundColor: theme.colors.cardSurface,
    },
    totalRow: {
      ...commonStyles.row,
      alignItems: 'baseline',
      gap: Space.sm,
    },
    total: {
      fontSize: FontSize.hero,
      lineHeight: UI_SIZE_42,
      fontWeight: FontWeight.heavy,
      letterSpacing: LetterSpacing.tight,
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
    },
    totalLabel: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      color: theme.colors.textSecondary,
    },
    bars: {
      ...commonStyles.row,
      alignItems: 'flex-end',
      gap: Space.sm,
    },
    barColumn: {
      ...commonStyles.flex1,
      alignItems: 'center',
      gap: Space.sm,
    },
    bar: {
      alignSelf: 'stretch',
      borderRadius: Radii.sm,
      borderCurve: 'continuous',
    },
    barEmpty: {
      backgroundColor: theme.colors.separator,
    },
    barFilled: {
      backgroundColor: hexWithAlpha(theme.colors.primary, 0.4),
    },
    barToday: {
      backgroundColor: theme.colors.primary,
    },
    dayLetter: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      color: theme.colors.textMuted,
    },
    dayLetterToday: {
      fontWeight: FontWeight.heavy,
      color: theme.colors.primary,
    },
  })
  return styles
})
