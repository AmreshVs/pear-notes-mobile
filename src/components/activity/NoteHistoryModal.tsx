import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, ScrollView, StyleSheet, View as RNView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ActivityRow } from '@/components/activity/ActivityRow'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_24,
  UI_SIZE_2,
  UI_SIZE_16,
  UI_SIZE_44,
  UI_SIZE_64,
} from '@/constants/commonStyles'
import { type ActivityEntry, type ActivityGroup, formatActivityDay } from '@/utils/activityUtils'

import { useNoteHistory } from './useNoteHistory'

type Props = {
  visible: boolean
  noteId: string
  onClose: () => void
}

export function NoteHistoryModal({ visible, noteId, onClose }: Props) {
  const { t } = useTranslation()
  const styles = useStyles()
  const { colors } = useTheme()
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
      <RNView key={group.key} style={styles.group}>
        <Text style={styles.groupTitle}>{formatActivityDay(group.at, t)}</Text>
        <RNView style={styles.groupRows}>{group.entries.map(renderEntry)}</RNView>
      </RNView>
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
      <RNView style={styles.root}>
        <RNView style={styles.header}>
          <Pressable
            onPress={onClose}
            hitSlop={UI_SIZE_16}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            style={({ pressed }) => [styles.iconBtn, pressed && commonStyles.pressed]}
          >
            <SymbolIcon name="chevron.left" size={UI_ICON_SIZE_24} color={colors.primary} />
          </Pressable>
          <RNView style={commonStyles.flex1}>
            <Text style={styles.headerTitle}>{t('activity.noteHistory')}</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {noteTitle || t('activity.untitledNote')}
            </Text>
          </RNView>
        </RNView>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {isEmpty || !enabled ? (
            <RNView style={styles.empty}>
              <RNView style={styles.emptyIcon}>
                <SymbolIcon
                  name="clock.arrow.circlepath"
                  size={UI_ICON_SIZE_20}
                  color={colors.textMuted}
                />
              </RNView>
              <Text style={styles.emptyTitle}>{emptyTitle}</Text>
              {!isLoading || !enabled ? <Text style={styles.emptyDesc}>{emptyDesc}</Text> : null}
            </RNView>
          ) : (
            <RNView style={styles.groups}>{groups.map(renderGroup)}</RNView>
          )}
        </ScrollView>
      </RNView>
    </Modal>
  )
}

const useHistoryHooks = () => {
  const insets = useSafeAreaInsets()
  return { insets }
}

const useStyles = createThemedStylesheetWithHooks((theme, { insets }) => {
  const styles = StyleSheet.create({
    root: {
      ...commonStyles.flex1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.sm,
      paddingTop: insets.top + Space.sm,
      paddingHorizontal: Space.base,
      paddingBottom: Space.md,
    },
    iconBtn: {
      width: UI_SIZE_44,
      height: UI_SIZE_44,
      ...commonStyles.centered,
    },
    headerTitle: {
      fontSize: FontSize.title,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
    },
    headerSubtitle: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
      marginTop: UI_SIZE_2,
    },
    scrollContent: {
      paddingHorizontal: Space.base,
      paddingBottom: Space.scrollBottom,
    },
    groups: {
      gap: Space.lg,
    },
    group: {
      gap: Space.sm,
    },
    groupTitle: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.textMuted,
      letterSpacing: 1,
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
      width: UI_SIZE_64,
      height: UI_SIZE_64,
      borderRadius: Radii.card,
      backgroundColor: theme.colors.controlBackground,
      ...commonStyles.centered,
    },
    emptyTitle: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    emptyDesc: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: FontSize.body * 1.4,
    },
  })
  return styles
}, useHistoryHooks)
