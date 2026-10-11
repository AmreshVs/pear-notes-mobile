import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import type { UpcomingTaskRowProps } from '@/components/upcoming/UpcomingTaskRow.types'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_12,
  UI_ICON_SIZE_16,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_12,
  UI_SIZE_22,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { formatUpcomingDue } from '@/hooks/useUpcomingTasks'
import { androidRipple } from '@/lib/androidRipple'
import { upcomingNoteLine } from '@/utils/upcomingFormat'

export const UpcomingTaskRow = memo(function UpcomingTaskRow({
  task,
  language,
  remind,
  pending,
  onOpen,
  onToggleDone,
}: UpcomingTaskRowProps) {
  const { t } = useTranslation()
  const { colors } = useMD3Theme()
  const styles = useStyles()
  const ripple = useMemo(() => androidRipple(colors.onSurface), [colors.onSurface])
  const handleOpen = useCallback(() => onOpen(task), [onOpen, task])
  const handleToggle = useCallback(() => onToggleDone(task), [onToggleDone, task])
  const doneLabel = t(task.done ? 'upcoming.markNotDone' : 'upcoming.markDone')

  return (
    <Pressable
      onPress={handleOpen}
      android_ripple={ripple}
      style={styles.row}
      accessibilityRole="button"
    >
      <Pressable
        onPress={handleToggle}
        disabled={pending}
        hitSlop={UI_SIZE_12}
        accessibilityRole="button"
        accessibilityLabel={doneLabel}
        style={[
          styles.doneBtn,
          task.checklist ? styles.doneSquare : styles.doneCircle,
          task.done && styles.doneFilled,
          pending && commonStyles.disabled,
        ]}
      >
        {task.done && (
          <MaterialCommunityIcons name="check" size={UI_ICON_SIZE_16} color={colors.onPrimary} />
        )}
      </Pressable>
      <View style={styles.body}>
        <Text style={task.done ? styles.taskTextDone : styles.taskText} numberOfLines={2}>
          {task.text}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{formatUpcomingDue(task, language)}</Text>
          {remind && (
            <MaterialCommunityIcons
              name="bell-outline"
              size={UI_ICON_SIZE_12}
              color={colors.primary}
            />
          )}
          <Text style={styles.metaNote} numberOfLines={1}>
            {`· ${upcomingNoteLine(task, t)}`}
          </Text>
        </View>
      </View>
      {task.yearly && (
        <MaterialCommunityIcons
          name="cake-variant-outline"
          size={UI_ICON_SIZE_16}
          color={colors.primary}
        />
      )}
    </Pressable>
  )
})

const useStyles = createThemedStylesheetWithHooks((_theme, md3) => {
  const c = md3.colors
  const taskBase = {
    fontSize: FontSize.subtitle,
    fontWeight: FontWeight.bold,
    fontFamily: FontFamily.bold,
  }
  const styles = StyleSheet.create({
    row: {
      ...commonStyles.row,
      alignItems: 'flex-start',
      gap: UI_SIZE_12,
      paddingVertical: UI_SIZE_12,
    },
    doneBtn: {
      ...commonStyles.centered,
      width: UI_SIZE_22,
      height: UI_SIZE_22,
      borderWidth: UI_SIZE_2,
      borderColor: c.outline,
    },
    doneCircle: {
      borderRadius: UI_SIZE_9999,
    },
    doneSquare: {
      borderRadius: UI_SIZE_6,
    },
    doneFilled: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    body: {
      ...commonStyles.flex1,
      gap: UI_SIZE_4,
    },
    taskText: {
      ...taskBase,
      color: c.onSurface,
    },
    taskTextDone: {
      ...taskBase,
      color: c.onSurfaceVariant,
      textDecorationLine: 'line-through',
    },
    metaRow: {
      ...commonStyles.row,
      gap: UI_SIZE_4,
    },
    meta: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.medium,
      color: c.onSurfaceVariant,
    },
    metaNote: {
      ...commonStyles.flex1,
      fontSize: FontSize.caption,
      fontFamily: FontFamily.medium,
      color: c.onSurfaceVariant,
    },
  })
  return styles
}, useMD3Theme)
