import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, ScrollView, StyleSheet, Switch, View as RNView } from 'react-native'

import {
  REMINDER_OFFSET_OPTIONS,
  UNTIMED_TIME_OPTIONS,
} from '@pear-notes/core/store/services/noteTasks.js'

import { Divider } from '@/components/Divider'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_15,
  UI_ICON_SIZE_20,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { useReminderPrefs } from '@/hooks/useReminderPrefs'
import { useRemindersSetting } from '@/hooks/useReminders'
import { showPicker } from '@/utils/settingsUtils'
import { formatReminderTime } from '@/utils/upcomingFormat'

type Props = {
  visible: boolean
  onClose: () => void
}

type OffsetRowProps = {
  offset: number
  label: string
  selected: boolean
  onToggle: (offset: number) => void
}

const OffsetRow = memo(function OffsetRow({ offset, label, selected, onToggle }: OffsetRowProps) {
  const { colors } = useTheme()
  const styles = useStyles()
  const handlePress = useCallback(() => onToggle(offset), [onToggle, offset])
  const accessibilityState = useMemo(() => ({ selected }), [selected])

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      style={({ pressed }) => [styles.optionRow, pressed && commonStyles.pressed]}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      {selected && <SymbolIcon name="checkmark" size={UI_ICON_SIZE_20} color={colors.primary} />}
    </Pressable>
  )
})

export function ReminderSettingsBottomSheet({ visible, onClose }: Props) {
  const { t, i18n } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const [remindersOn, toggleReminders] = useRemindersSetting()
  const { prefs, toggleOffset, setUntimed } = useReminderPrefs(visible)

  const trackColor = useMemo(
    () => ({ false: colors.controlBackground, true: colors.primary }),
    [colors.controlBackground, colors.primary],
  )

  const untimedOptions = useMemo(
    () =>
      (UNTIMED_TIME_OPTIONS as string[]).map((value) => ({
        value,
        label: formatReminderTime(value, i18n.language),
      })),
    [i18n.language],
  )

  const handleUntimedPress = useCallback(() => {
    showPicker(
      t('upcoming.reminders.untimed'),
      untimedOptions,
      prefs?.untimed ?? '',
      setUntimed,
      t('common.cancel'),
    )
  }, [t, untimedOptions, prefs?.untimed, setUntimed])

  const renderOffset = useCallback(
    (offset: number, index: number) => (
      <RNView key={offset}>
        {index > 0 && (
          <RNView style={styles.dividerWrap}>
            <Divider />
          </RNView>
        )}
        <OffsetRow
          offset={offset}
          label={t(`upcoming.reminders.offsets.${offset}`)}
          selected={prefs?.offsets.includes(offset) ?? false}
          onToggle={toggleOffset}
        />
      </RNView>
    ),
    [t, prefs?.offsets, toggleOffset, styles.dividerWrap],
  )

  const untimedLabel = untimedOptions.find((o) => o.value === prefs?.untimed)?.label ?? ''

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <RNView style={commonThemedStyles.modalContainer}>
        <RNView style={styles.header}>
          <Text style={styles.title}>{t('upcoming.reminders.title')}</Text>
          <Pressable
            onPress={onClose}
            hitSlop={Space.sm}
            accessibilityRole="button"
            style={({ pressed }) => pressed && commonStyles.pressed}
          >
            <Text style={styles.doneLabel}>{t('common.done')}</Text>
          </Pressable>
        </RNView>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <RNView style={commonThemedStyles.card}>
            <RNView style={styles.toggleRow}>
              <RNView style={styles.toggleInfo}>
                <Text style={styles.rowLabel}>{t('upcoming.reminders.notifications')}</Text>
                <Text style={styles.rowDesc}>{t('upcoming.reminders.notificationsDesc')}</Text>
              </RNView>
              <Switch
                value={remindersOn}
                onValueChange={toggleReminders}
                trackColor={trackColor}
                thumbColor={colors.white}
              />
            </RNView>
          </RNView>

          <Text style={[commonThemedStyles.sectionCamelCase, commonStyles.sectionHeader]}>
            {t('upcoming.reminders.remindMe')}
          </Text>
          <RNView style={commonThemedStyles.card}>
            {(REMINDER_OFFSET_OPTIONS as number[]).map(renderOffset)}
          </RNView>

          <Text style={[commonThemedStyles.sectionCamelCase, commonStyles.sectionHeader]}>
            {t('upcoming.reminders.untimed')}
          </Text>
          <RNView style={commonThemedStyles.card}>
            <Pressable
              onPress={handleUntimedPress}
              style={({ pressed }) => [styles.toggleRow, pressed && commonStyles.pressed]}
            >
              <RNView style={styles.toggleInfo}>
                <Text style={styles.rowDesc}>{t('upcoming.reminders.untimedDesc')}</Text>
              </RNView>
              <RNView style={commonStyles.settingsRowRight}>
                <Text style={styles.rowVal}>{untimedLabel}</Text>
                <SymbolIcon
                  name="chevron.forward"
                  size={UI_ICON_SIZE_15}
                  color={colors.textMuted}
                />
              </RNView>
            </Pressable>
          </RNView>

          <Text style={styles.footnote}>{t('upcoming.reminders.syncNote')}</Text>
        </ScrollView>
      </RNView>
    </Modal>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    header: {
      ...commonStyles.rowBetween,
      paddingHorizontal: Space.lg,
      paddingTop: Space.lg,
      paddingBottom: Space.sm,
    },
    title: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
    },
    doneLabel: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      color: theme.colors.primary,
    },
    scroll: {
      paddingHorizontal: Space.lg,
      paddingTop: Space.md,
      paddingBottom: Space.xxxl,
    },
    toggleRow: {
      ...commonStyles.rowBetween,
      paddingHorizontal: Space.base,
      paddingVertical: Space.base,
      gap: Space.md,
    },
    toggleInfo: {
      ...commonStyles.flex1,
      gap: Space.xs,
    },
    optionRow: {
      ...commonStyles.rowBetween,
      paddingHorizontal: Space.base,
      paddingVertical: Space.base,
    },
    dividerWrap: {
      marginHorizontal: Space.base,
    },
    rowLabel: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    rowDesc: {
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
    },
    rowVal: {
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
    },
    footnote: {
      marginTop: Space.base,
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
    },
  })
  return styles
})
