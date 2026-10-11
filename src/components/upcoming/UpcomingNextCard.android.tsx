import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, Text } from 'react-native'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import type { UpcomingNextCardProps } from '@/components/upcoming/UpcomingTaskRow.types'
import {
  FontFamily,
  FontSize,
  FontWeight,
  UI_SIZE_4,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_28,
} from '@/constants/commonStyles'
import { formatUpcomingWhen } from '@/hooks/useUpcomingTasks'
import { androidRipple } from '@/lib/androidRipple'
import { upcomingNoteLine } from '@/utils/upcomingFormat'

export const UpcomingNextCard = memo(function UpcomingNextCard({
  task,
  language,
  onOpen,
}: UpcomingNextCardProps) {
  const { t } = useTranslation()
  const { colors } = useMD3Theme()
  const styles = useStyles()
  const ripple = useMemo(
    () => androidRipple(colors.onPrimaryContainer),
    [colors.onPrimaryContainer],
  )
  const handleOpen = useCallback(() => onOpen(task), [onOpen, task])

  return (
    <Pressable
      onPress={handleOpen}
      android_ripple={ripple}
      style={styles.card}
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

const useStyles = createThemedStylesheetWithHooks((_theme, md3) => {
  const c = md3.colors
  const styles = StyleSheet.create({
    card: {
      overflow: 'hidden',
      marginBottom: UI_SIZE_12,
      padding: UI_SIZE_16,
      gap: UI_SIZE_4,
      borderRadius: UI_SIZE_28,
      backgroundColor: c.primaryContainer,
    },
    caption: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.heavy,
      fontFamily: FontFamily.extraBold,
      color: c.onPrimaryContainer,
    },
    taskText: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onPrimaryContainer,
    },
    meta: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.medium,
      color: c.onPrimaryContainer,
    },
  })
  return styles
}, useMD3Theme)
