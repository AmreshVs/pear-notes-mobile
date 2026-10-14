import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View as RNView } from 'react-native'

import { isAppointment } from '@pear-notes/core/store/services/noteTasks.js'

import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import type { UpcomingTaskRowProps } from '@/components/upcoming/UpcomingTaskRow.types'
import {
  commonStyles,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_12,
  UI_ICON_SIZE_16,
  UI_SIZE_2,
  UI_SIZE_6,
  UI_SIZE_22,
} from '@/constants/commonStyles'
import { formatUpcomingWhenShort } from '@/hooks/useUpcomingTasks'
import { upcomingNoteLine, upcomingText } from '@/utils/upcomingFormat'

export const UpcomingTaskRow = memo(function UpcomingTaskRow({
  task,
  language,
  remind,
  pending,
  onOpen,
  onToggleDone,
}: UpcomingTaskRowProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const handleOpen = useCallback(() => onOpen(task), [onOpen, task])
  const handleToggle = useCallback(() => onToggleDone(task), [onToggleDone, task])
  const doneLabel = t(task.done ? 'upcoming.markNotDone' : 'upcoming.markDone')

  return (
    <Pressable
      onPress={handleOpen}
      style={({ pressed }) => [styles.row, pressed && commonStyles.pressed]}
      accessibilityRole="button"
    >
      {isAppointment(task) ? (
        <SymbolIcon name="calendar" size={UI_SIZE_22} color={colors.primary} />
      ) : (
        <Pressable
          onPress={handleToggle}
          disabled={pending}
          hitSlop={Space.sm}
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
            <SymbolIcon
              name="checkmark"
              size={UI_ICON_SIZE_12}
              color={colors.onPrimary}
              weight="semibold"
            />
          )}
        </Pressable>
      )}
      <RNView style={styles.body}>
        <Text style={task.done ? styles.taskTextDone : styles.taskText} numberOfLines={2}>
          {upcomingText(task)}
        </Text>
        <Text style={styles.metaNote} numberOfLines={1}>
          {upcomingNoteLine(task, t)}
        </Text>
      </RNView>
      <RNView style={styles.whenRow}>
        {remind && <SymbolIcon name="bell" size={UI_ICON_SIZE_12} color={colors.primary} />}
        {task.yearly && (
          <SymbolIcon name="birthday.cake" size={UI_ICON_SIZE_16} color={colors.primary} />
        )}
        <Text style={styles.when}>{formatUpcomingWhenShort(task, language)}</Text>
      </RNView>
    </Pressable>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const taskBase = {
    fontSize: FontSize.subtitle,
    fontWeight: FontWeight.bold,
  }
  const styles = StyleSheet.create({
    row: {
      ...commonStyles.row,
      alignItems: 'flex-start',
      gap: Space.md,
      paddingVertical: Space.md,
      paddingHorizontal: Space.base,
    },
    doneBtn: {
      ...commonStyles.centered,
      width: UI_SIZE_22,
      height: UI_SIZE_22,
      borderWidth: UI_SIZE_2,
      borderColor: theme.colors.textMuted,
    },
    doneCircle: {
      borderRadius: Radii.pill,
    },
    doneSquare: {
      borderRadius: UI_SIZE_6,
    },
    doneFilled: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    body: {
      ...commonStyles.flex1,
      gap: Space.xs,
    },
    taskText: {
      ...taskBase,
      color: theme.colors.text,
    },
    taskTextDone: {
      ...taskBase,
      color: theme.colors.textMuted,
      textDecorationLine: 'line-through',
    },
    metaNote: {
      fontSize: FontSize.caption,
      color: theme.colors.textSecondary,
    },
    whenRow: {
      ...commonStyles.row,
      gap: Space.xs,
      marginTop: UI_SIZE_2,
    },
    when: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      color: theme.colors.primary,
      fontVariant: ['tabular-nums'],
    },
  })
  return styles
})
