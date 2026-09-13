import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { ActivityRow } from '@/components/activity/ActivityRow'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_24,
  UI_ICON_SIZE_36,
  UI_SIZE_2,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_44,
  UI_SIZE_72,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'
import { type ActivityEntry, type ActivityGroup, formatActivityDay } from '@/utils/activityUtils'

import { useNoteHistory } from './useNoteHistory'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  onSurfaceVariant?: string
}

const rippleBorderless = { borderless: true }

type Props = {
  visible: boolean
  noteId: string
  onClose: () => void
}

export function NoteHistoryModal({ visible, noteId, onClose }: Props) {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const { groups, noteTitle, isLoading, enabled, isEmpty, expandedId, toggleExpanded } =
    useNoteHistory(noteId)

  const renderEntry = useCallback(
    (entry: ActivityEntry) => (
      <ActivityRow
        key={entry.id}
        entry={entry}
        expanded={expandedId === entry.id}
        showTarget={false}
        onToggle={toggleExpanded}
      />
    ),
    [expandedId, toggleExpanded],
  )

  const renderGroup = useCallback(
    (group: ActivityGroup) => (
      <View key={group.key} style={styles.group}>
        <Text style={styles.groupTitle}>{formatActivityDay(group.at, t)}</Text>
        <View style={styles.groupRows}>{group.entries.map(renderEntry)}</View>
      </View>
    ),
    [styles, t, renderEntry],
  )

  const emptyTitle = !enabled
    ? t('activity.empty.disabledTitle')
    : isLoading
      ? t('common.loading')
      : t('activity.empty.noteTitle')

  const emptyDesc = !enabled
    ? t('activity.empty.disabledDescription')
    : t('activity.empty.noteDescription')

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            android_ripple={rippleBorderless}
            hitSlop={UI_SIZE_12}
            style={styles.iconBtn}
          >
            <MaterialCommunityIcons name="arrow-left" size={UI_ICON_SIZE_24} color={c.primary} />
          </Pressable>
          <View style={commonStyles.flex1}>
            <Text style={styles.headerTitle}>{t('activity.noteHistory')}</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {noteTitle || t('activity.untitledNote')}
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {isEmpty || !enabled ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <MaterialCommunityIcons
                  name="history"
                  size={UI_ICON_SIZE_36}
                  color={c.onSurfaceVariant}
                />
              </View>
              <Text style={styles.emptyTitle}>{emptyTitle}</Text>
              {!isLoading || !enabled ? <Text style={styles.emptyDesc}>{emptyDesc}</Text> : null}
            </View>
          ) : (
            <View style={styles.groups}>{groups.map(renderGroup)}</View>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

const useHistoryHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3, insets }) => {
  const c = md3.colors as ExtendedColors

  const styles = StyleSheet.create({
    root: {
      ...commonStyles.flex1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_16,
      paddingTop: insets.top + UI_SIZE_16,
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: UI_SIZE_16,
    },
    iconBtn: {
      width: UI_SIZE_44,
      height: UI_SIZE_44,
      ...commonStyles.centered,
      overflow: 'hidden',
      borderRadius: UI_SIZE_9999,
    },
    headerTitle: {
      fontSize: FontSize.title,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onSurface,
    },
    headerSubtitle: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      marginTop: UI_SIZE_2,
    },
    scrollContent: {
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: Space.scrollBottom,
    },
    groups: {
      gap: UI_SIZE_20,
    },
    group: {
      gap: Space.sm,
    },
    groupTitle: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurfaceVariant,
      letterSpacing: 1,
      paddingHorizontal: UI_SIZE_2,
    },
    groupRows: {
      gap: Space.sm,
    },
    empty: {
      alignItems: 'center',
      gap: Space.sm,
      paddingVertical: Space.xxl,
    },
    emptyIcon: {
      width: UI_SIZE_72,
      height: UI_SIZE_72,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.onSurface, 0.06),
      ...commonStyles.centered,
    },
    emptyTitle: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurface,
    },
    emptyDesc: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: FontSize.body * 1.4,
    },
  })
  return styles
}, useHistoryHooks)
