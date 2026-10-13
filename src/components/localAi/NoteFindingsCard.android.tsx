import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_SIZE_2,
  UI_SIZE_6,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_28,
  UI_SIZE_40,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

import type { NoteFinding } from './useNoteFindings'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  onSurfaceVariant?: string
  primaryContainer?: string
  onPrimaryContainer?: string
}

interface NoteFindingsCardProps {
  findings: NoteFinding[]
  canAddToUpcoming: boolean
  addDisabled: boolean
  remindersOn: boolean
  onAddToUpcoming: () => void
  onSetReminders: () => void
}

export const NoteFindingsCard = memo(function NoteFindingsCard({
  findings,
  canAddToUpcoming,
  addDisabled,
  remindersOn,
  onAddToUpcoming,
  onSetReminders,
}: NoteFindingsCardProps) {
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const ripple = useMemo(() => androidRipple(c.primary), [c.primary])

  const renderFinding = useCallback(
    (item: NoteFinding) => (
      <View key={item.key} style={styles.row}>
        <Text style={styles.day}>{item.day}</Text>
        <View style={styles.rowText}>
          <Text style={styles.text}>{item.text}</Text>
          {!item.isTask && <Text style={styles.note}>{t('inThisNote.notTaskYet')}</Text>}
        </View>
      </View>
    ),
    [styles, t],
  )

  return (
    <View style={styles.section}>
      <Text style={styles.label}>{t('inThisNote.datesAndTasks')}</Text>
      <View style={styles.card}>
        {findings.map(renderFinding)}
        <View style={styles.actions}>
          {remindersOn ? (
            <Text style={styles.note}>{t('inThisNote.remindersOn')}</Text>
          ) : (
            <Pressable
              onPress={onSetReminders}
              android_ripple={ripple}
              accessibilityRole="button"
              style={styles.textButton}
            >
              <Text style={styles.textButtonLabel}>{t('inThisNote.setReminders')}</Text>
            </Pressable>
          )}
          {canAddToUpcoming && (
            <Pressable
              onPress={onAddToUpcoming}
              disabled={addDisabled}
              accessibilityRole="button"
              style={[styles.filledButton, addDisabled && commonStyles.disabled]}
            >
              <Text style={styles.filledLabel}>{t('inThisNote.addToUpcoming')}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  )
})

const useStyles = createThemedStylesheetWithHooks((_theme, md3Theme) => {
  const c = md3Theme.colors as ExtendedColors
  const styles = StyleSheet.create({
    section: {
      gap: Space.sm,
    },
    label: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.primary,
      paddingHorizontal: Space.xs,
    },
    card: {
      gap: UI_SIZE_16,
      paddingHorizontal: UI_SIZE_20,
      paddingVertical: UI_SIZE_16,
      borderRadius: UI_SIZE_28,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: UI_SIZE_12,
    },
    day: {
      overflow: 'hidden',
      paddingHorizontal: UI_SIZE_8,
      paddingVertical: UI_SIZE_2,
      borderRadius: UI_SIZE_6,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.35),
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onPrimaryContainer ?? c.onSurface,
    },
    rowText: {
      ...commonStyles.flex1,
      gap: UI_SIZE_2,
    },
    text: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.medium,
      fontWeight: FontWeight.medium,
      color: c.onSurface,
    },
    note: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      flexWrap: 'wrap',
      gap: Space.xs,
    },
    textButton: {
      ...commonStyles.centered,
      minHeight: UI_SIZE_40,
      paddingHorizontal: UI_SIZE_12,
      borderRadius: UI_SIZE_9999,
      overflow: 'hidden',
    },
    textButtonLabel: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.primary,
    },
    filledButton: {
      ...commonStyles.centered,
      minHeight: UI_SIZE_40,
      paddingHorizontal: Space.lg,
      borderRadius: UI_SIZE_9999,
      backgroundColor: c.primary,
    },
    filledLabel: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onPrimary,
    },
  })
  return styles
}, useMD3Theme)
