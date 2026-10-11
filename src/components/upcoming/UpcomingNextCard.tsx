import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet } from 'react-native'

import { createThemedStylesheet, Text } from '@/components/Themed'
import type { UpcomingNextCardProps } from '@/components/upcoming/UpcomingTaskRow.types'
import {
  commonStyles,
  FontSize,
  FontWeight,
  LetterSpacing,
  Radii,
  Space,
} from '@/constants/commonStyles'
import { formatUpcomingWhen } from '@/hooks/useUpcomingTasks'
import { upcomingNoteLine } from '@/utils/upcomingFormat'

export const UpcomingNextCard = memo(function UpcomingNextCard({
  task,
  language,
  onOpen,
}: UpcomingNextCardProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const handleOpen = useCallback(() => onOpen(task), [onOpen, task])

  return (
    <Pressable
      onPress={handleOpen}
      style={({ pressed }) => [styles.card, pressed && commonStyles.pressed]}
      accessibilityRole="button"
    >
      <Text style={styles.caption}>
        {t('upcoming.next', { when: formatUpcomingWhen(task, language) })}
      </Text>
      <Text style={styles.taskText} numberOfLines={2}>
        {task.text}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {upcomingNoteLine(task, t)}
      </Text>
    </Pressable>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    card: {
      marginHorizontal: Space.base,
      marginBottom: Space.sm,
      paddingHorizontal: Space.base,
      paddingVertical: Space.md,
      gap: Space.xs,
      borderRadius: Radii.card,
      borderCurve: 'continuous',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.cardSelectedBorder,
      backgroundColor: theme.colors.cardSelected,
    },
    caption: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.heavy,
      letterSpacing: LetterSpacing.wide,
      color: theme.colors.textSecondary,
    },
    taskText: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
    },
    meta: {
      fontSize: FontSize.caption,
      color: theme.colors.textSecondary,
    },
  })
  return styles
})
