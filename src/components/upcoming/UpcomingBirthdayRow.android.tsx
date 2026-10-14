import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import type {
  UpcomingAllBirthdaysRowProps,
  UpcomingBirthdayRowProps,
} from '@/components/upcoming/UpcomingTaskRow.types'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_16,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_10,
  UI_SIZE_14,
  UI_SIZE_16,
  UI_SIZE_40,
  UI_SIZE_44,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { birthdayMeta, birthdayTile, upcomingText } from '@/utils/upcomingFormat'

export const UpcomingBirthdayRow = memo(function UpcomingBirthdayRow({
  task,
  language,
  onOpen,
}: UpcomingBirthdayRowProps) {
  const { t } = useTranslation()
  const { colors } = useMD3Theme()
  const styles = useStyles()
  const ripple = useMemo(() => androidRipple(colors.onSurface), [colors.onSurface])
  const handleOpen = useCallback(() => onOpen(task), [onOpen, task])
  const tile = birthdayTile(task, language)

  return (
    <Pressable
      onPress={handleOpen}
      android_ripple={ripple}
      style={styles.row}
      accessibilityRole="button"
    >
      <View style={styles.tile}>
        <Text style={styles.tileMonth}>{tile.month}</Text>
        <Text style={styles.tileDay}>{tile.day}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {upcomingText(task)}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {birthdayMeta(task, t)}
        </Text>
      </View>
    </Pressable>
  )
})

export const UpcomingAllBirthdaysRow = memo(function UpcomingAllBirthdaysRow({
  count,
  onPress,
}: UpcomingAllBirthdaysRowProps) {
  const { t } = useTranslation()
  const { colors } = useMD3Theme()
  const styles = useStyles()
  const ripple = useMemo(() => androidRipple(colors.onSurface), [colors.onSurface])

  return (
    <Pressable
      onPress={onPress}
      android_ripple={ripple}
      style={styles.allRow}
      accessibilityRole="button"
    >
      <Text style={styles.allLabel}>{t('upcoming.allBirthdays')}</Text>
      <View style={styles.allEnd}>
        <Text style={styles.allCount}>{count}</Text>
        <MaterialCommunityIcons
          name="chevron-right"
          size={UI_ICON_SIZE_16}
          color={colors.onSurfaceVariant}
        />
      </View>
    </Pressable>
  )
})

const useStyles = createThemedStylesheetWithHooks((_theme, md3) => {
  const c = md3.colors
  const styles = StyleSheet.create({
    row: {
      ...commonStyles.row,
      gap: UI_SIZE_14,
      paddingVertical: UI_SIZE_10,
      paddingHorizontal: UI_SIZE_16,
    },
    tile: {
      ...commonStyles.centered,
      width: UI_SIZE_40,
      height: UI_SIZE_44,
      borderRadius: UI_SIZE_14,
      backgroundColor: c.primaryContainer,
    },
    tileMonth: {
      fontSize: UI_SIZE_10,
      fontFamily: FontFamily.extraBold,
      fontWeight: FontWeight.heavy,
      textTransform: 'uppercase',
      color: c.onPrimaryContainer,
    },
    tileDay: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.extraBold,
      fontWeight: FontWeight.heavy,
      color: c.onPrimaryContainer,
      fontVariant: ['tabular-nums'],
    },
    body: {
      ...commonStyles.flex1,
      gap: UI_SIZE_2,
    },
    name: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onSurface,
    },
    meta: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.medium,
      color: c.onSurfaceVariant,
    },
    allRow: {
      ...commonStyles.rowBetween,
      paddingVertical: UI_SIZE_14,
      paddingHorizontal: UI_SIZE_16,
    },
    allLabel: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.primary,
    },
    allEnd: {
      ...commonStyles.row,
      gap: UI_SIZE_4,
    },
    allCount: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurfaceVariant,
      fontVariant: ['tabular-nums'],
    },
  })
  return styles
}, useMD3Theme)
