import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Switch } from 'react-native-paper'
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from '@expo/ui/community/bottom-sheet'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import {
  REMINDER_OFFSET_OPTIONS,
  UNTIMED_TIME_OPTIONS,
} from '@pear-notes/core/store/services/noteTasks.js'

import { BottomActionSheet, type SheetAction } from '@/components/android/BottomActionSheet'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { useSheetStyles } from '@/components/android/useSheetStyles'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_20,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_16,
} from '@/constants/commonStyles'
import { useReminderPrefs } from '@/hooks/useReminderPrefs'
import { useRemindersSetting } from '@/hooks/useReminders'
import { androidRipple } from '@/lib/androidRipple'
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
  const sheet = useSheetStyles()
  const { colors } = useMD3Theme()
  const ripple = useMemo(() => androidRipple(colors.onSurface), [colors.onSurface])
  const handlePress = useCallback(() => onToggle(offset), [onToggle, offset])
  const accessibilityState = useMemo(() => ({ selected }), [selected])

  return (
    <Pressable
      onPress={handlePress}
      android_ripple={ripple}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      style={sheet.row}
    >
      <Text style={sheet.rowLabel}>{label}</Text>
      {selected && (
        <MaterialCommunityIcons name="check" size={UI_ICON_SIZE_20} color={colors.primary} />
      )}
    </Pressable>
  )
})

export function ReminderSettingsBottomSheet({ visible, onClose }: Props) {
  const { t, i18n } = useTranslation()
  const ref = useRef<BottomSheetModal>(null)
  const sheet = useSheetStyles()
  const styles = useStyles()
  const { colors } = useMD3Theme()
  const [pickerVisible, setPickerVisible] = useState(false)
  const [remindersOn, toggleReminders] = useRemindersSetting()
  const { prefs, toggleOffset, setUntimed } = useReminderPrefs(visible)
  const ripple = useMemo(() => androidRipple(colors.onSurface), [colors.onSurface])

  useEffect(() => {
    if (visible) {
      ref.current?.present()
    } else {
      ref.current?.dismiss()
    }
  }, [visible])

  const handleOpenPicker = useCallback(() => setPickerVisible(true), [])
  const handleClosePicker = useCallback(() => setPickerVisible(false), [])

  const pickerActions = useMemo<SheetAction[]>(
    () =>
      (UNTIMED_TIME_OPTIONS as string[]).map((value) => ({
        icon: 'clock-outline',
        label: formatReminderTime(value, i18n.language),
        selected: prefs?.untimed === value,
        noRightIcon: prefs?.untimed !== value,
        onPress: () => {
          setUntimed(value)
          setPickerVisible(false)
        },
      })),
    [i18n.language, prefs?.untimed, setUntimed],
  )

  const renderOffset = useCallback(
    (offset: number, index: number) => (
      <Fragment key={offset}>
        {index > 0 && <View style={styles.separator} />}
        <OffsetRow
          offset={offset}
          label={t(`upcoming.reminders.offsets.${offset}`)}
          selected={prefs?.offsets.includes(offset) ?? false}
          onToggle={toggleOffset}
        />
      </Fragment>
    ),
    [t, prefs?.offsets, toggleOffset, styles.separator],
  )

  const untimedLabel = prefs ? formatReminderTime(prefs.untimed, i18n.language) : ''

  return (
    <>
      <BottomSheetModal
        ref={ref}
        enableDynamicSizing
        enablePanDownToClose
        backgroundStyle={sheet.sheetBackground}
        handleIndicatorStyle={sheet.handleIndicator}
        onDismiss={onClose}
      >
        <BottomSheetView style={sheet.content}>
          <View style={sheet.header}>
            <Text style={sheet.title}>{t('upcoming.reminders.title')}</Text>
          </View>
          <BottomSheetScrollView showsVerticalScrollIndicator={false}>
            <View style={sheet.card}>
              <View style={styles.toggleRow}>
                <View style={commonStyles.flex1}>
                  <Text style={sheet.rowLabel}>{t('upcoming.reminders.notifications')}</Text>
                  <Text style={styles.desc}>{t('upcoming.reminders.notificationsDesc')}</Text>
                </View>
                <Switch value={remindersOn} onValueChange={toggleReminders} />
              </View>
            </View>

            <Text style={styles.sectionLabel}>{t('upcoming.reminders.remindMe')}</Text>
            <View style={sheet.card}>
              {(REMINDER_OFFSET_OPTIONS as number[]).map(renderOffset)}
            </View>

            <Text style={styles.sectionLabel}>{t('upcoming.reminders.untimed')}</Text>
            <View style={sheet.card}>
              <Pressable
                onPress={handleOpenPicker}
                android_ripple={ripple}
                accessibilityRole="button"
                style={styles.toggleRow}
              >
                <View style={commonStyles.flex1}>
                  <Text style={sheet.rowLabel}>{untimedLabel}</Text>
                  <Text style={styles.desc}>{t('upcoming.reminders.untimedDesc')}</Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={UI_ICON_SIZE_20}
                  color={colors.onSurfaceVariant}
                />
              </Pressable>
            </View>

            <Text style={styles.footnote}>{t('upcoming.reminders.syncNote')}</Text>
          </BottomSheetScrollView>
          <View style={sheet.bottomPad} />
        </BottomSheetView>
      </BottomSheetModal>

      <BottomActionSheet
        visible={pickerVisible}
        onDismiss={handleClosePicker}
        title={t('upcoming.reminders.untimed')}
        actions={pickerActions}
      />
    </>
  )
}

const useStyles = createThemedStylesheetWithHooks((_theme, md3) => {
  const c = md3.colors
  const styles = StyleSheet.create({
    toggleRow: {
      ...commonStyles.rowBetween,
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_12,
      gap: UI_SIZE_16,
    },
    desc: {
      marginTop: UI_SIZE_4,
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    sectionLabel: {
      marginTop: UI_SIZE_16,
      marginBottom: UI_SIZE_8,
      marginLeft: UI_SIZE_4,
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurfaceVariant,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      marginHorizontal: UI_SIZE_16,
      backgroundColor: c.outlineVariant,
    },
    footnote: {
      marginTop: UI_SIZE_16,
      marginHorizontal: UI_SIZE_4,
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
  })
  return styles
}, useMD3Theme)
