import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'

import { createThemedStylesheet, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_SIZE_2,
  UI_SIZE_6,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_14,
} from '@/constants/commonStyles'

import type { NoteFinding } from './useNoteFindings'

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
  const styles = useStyles()

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
          {canAddToUpcoming && (
            <Pressable
              onPress={onAddToUpcoming}
              disabled={addDisabled}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.primaryButton,
                addDisabled && commonStyles.disabled,
                pressed && commonStyles.pressed,
              ]}
            >
              <Text style={styles.primaryText}>{t('inThisNote.addToUpcoming')}</Text>
            </Pressable>
          )}
          {remindersOn ? (
            <Text style={styles.note}>{t('inThisNote.remindersOn')}</Text>
          ) : (
            <Pressable
              onPress={onSetReminders}
              accessibilityRole="button"
              style={({ pressed }) => [styles.secondaryButton, pressed && commonStyles.pressed]}
            >
              <Text style={styles.secondaryText}>{t('inThisNote.setReminders')}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    section: {
      gap: Space.sm,
    },
    label: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.textSecondary,
      paddingHorizontal: Space.xs,
    },
    card: {
      gap: Space.md,
      padding: UI_SIZE_14,
      borderRadius: Radii.card,
      borderCurve: 'continuous',
      backgroundColor: theme.colors.cardSurface,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: UI_SIZE_10,
    },
    day: {
      overflow: 'hidden',
      paddingHorizontal: UI_SIZE_6,
      paddingVertical: UI_SIZE_2,
      borderRadius: Radii.xs,
      backgroundColor: theme.colors.cardSelected,
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.primary,
    },
    rowText: {
      ...commonStyles.flex1,
      gap: UI_SIZE_2,
    },
    text: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    note: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
    },
    actions: {
      ...commonStyles.row,
      flexWrap: 'wrap',
      gap: UI_SIZE_8,
    },
    primaryButton: {
      paddingHorizontal: UI_SIZE_14,
      paddingVertical: UI_SIZE_8,
      borderRadius: Radii.pill,
      backgroundColor: theme.colors.primary,
    },
    primaryText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.onPrimary,
    },
    secondaryButton: {
      paddingHorizontal: UI_SIZE_14,
      paddingVertical: UI_SIZE_8,
      borderRadius: Radii.pill,
      backgroundColor: theme.colors.controlBackground,
    },
    secondaryText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
  })
  return styles
})
