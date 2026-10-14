import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View as RNView } from 'react-native'

import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import type {
  UpcomingAllBirthdaysRowProps,
  UpcomingBirthdayRowProps,
} from '@/components/upcoming/UpcomingTaskRow.types'
import {
  commonStyles,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_12,
  UI_SIZE_2,
  UI_SIZE_10,
  UI_SIZE_40,
} from '@/constants/commonStyles'
import { birthdayMeta, birthdayTile, upcomingText } from '@/utils/upcomingFormat'

export const UpcomingBirthdayRow = memo(function UpcomingBirthdayRow({
  task,
  language,
  onOpen,
}: UpcomingBirthdayRowProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const handleOpen = useCallback(() => onOpen(task), [onOpen, task])
  const tile = birthdayTile(task, language)

  return (
    <Pressable
      onPress={handleOpen}
      style={({ pressed }) => [styles.row, pressed && commonStyles.pressed]}
      accessibilityRole="button"
    >
      <RNView style={styles.tile}>
        <Text style={styles.tileMonth}>{tile.month}</Text>
        <Text style={styles.tileDay}>{tile.day}</Text>
      </RNView>
      <RNView style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {upcomingText(task)}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {birthdayMeta(task, t)}
        </Text>
      </RNView>
    </Pressable>
  )
})

export const UpcomingAllBirthdaysRow = memo(function UpcomingAllBirthdaysRow({
  count,
  onPress,
}: UpcomingAllBirthdaysRowProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.allRow, pressed && commonStyles.pressed]}
      accessibilityRole="button"
    >
      <Text style={styles.allLabel}>{t('upcoming.allBirthdays')}</Text>
      <RNView style={styles.allEnd}>
        <Text style={styles.allCount}>{count}</Text>
        <SymbolIcon
          name="chevron.forward"
          size={UI_ICON_SIZE_12}
          color={colors.textMuted}
          weight="semibold"
        />
      </RNView>
    </Pressable>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    row: {
      ...commonStyles.row,
      gap: Space.md,
      paddingVertical: Space.sm,
      paddingHorizontal: Space.base,
    },
    tile: {
      ...commonStyles.centered,
      width: UI_SIZE_40,
      paddingVertical: Space.xs,
      borderRadius: Radii.md,
      borderCurve: 'continuous',
      backgroundColor: theme.colors.cardSelected,
    },
    tileMonth: {
      fontSize: UI_SIZE_10,
      fontWeight: FontWeight.heavy,
      textTransform: 'uppercase',
      color: theme.colors.primary,
    },
    tileDay: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
    },
    body: {
      ...commonStyles.flex1,
      gap: UI_SIZE_2,
    },
    name: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    meta: {
      fontSize: FontSize.caption,
      color: theme.colors.textSecondary,
    },
    allRow: {
      ...commonStyles.rowBetween,
      paddingVertical: Space.md,
      paddingHorizontal: Space.base,
    },
    allLabel: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.medium,
      color: theme.colors.primary,
    },
    allEnd: {
      ...commonStyles.row,
      gap: Space.sm,
    },
    allCount: {
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
  })
  return styles
})
