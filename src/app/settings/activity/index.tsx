import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, Switch, View as RNView } from 'react-native'
import { Easing, FadeInDown, LinearTransition } from 'react-native-reanimated'

import { formatBytes } from '@pear-notes/core/utils.js'

import { ActivityRow } from '@/components/activity/ActivityRow'
import { MotionView } from '@/components/MotionView'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  Durations,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_15,
  UI_ICON_SIZE_20,
  UI_SIZE_2,
  UI_SIZE_40,
  UI_SIZE_64,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import {
  type ActivityEntry,
  type ActivityGroup,
  formatActivityDay,
  getActivityDeviceOptions,
} from '@/utils/activityUtils'
import {
  getActivityFilterOptions,
  getActivityRetentionOptions,
  showPicker,
} from '@/utils/settingsUtils'

import { useActivityScreen } from './useActivityScreen'

export default function ActivityScreen() {
  const { t } = useTranslation()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const { colors } = useTheme()
  const {
    groups,
    devices,
    enabled,
    retentionDays,
    filter,
    deviceFilter,
    hasMore,
    isLoadingMore,
    isClearing,
    stats,
    expandedId,
    confirmingClear,
    isEmpty,
    toggleEnabled,
    selectRetention,
    selectFilter,
    selectDevice,
    loadMore,
    toggleExpanded,
    requestClear,
    cancelClear,
    confirmClear,
  } = useActivityScreen()

  const handleRetentionPress = useCallback(() => {
    showPicker(
      t('activity.settings.retention'),
      getActivityRetentionOptions(t),
      String(retentionDays),
      (value) => selectRetention(Number(value)),
      t('common.cancel'),
    )
  }, [t, retentionDays, selectRetention])

  const handleFilterPress = useCallback(() => {
    showPicker(
      t('activity.timeline'),
      getActivityFilterOptions(t),
      filter,
      selectFilter,
      t('common.cancel'),
    )
  }, [t, filter, selectFilter])

  const handleDevicePress = useCallback(() => {
    showPicker(
      t('activity.filters.anyDevice'),
      getActivityDeviceOptions(devices, t),
      deviceFilter,
      selectDevice,
      t('common.cancel'),
    )
  }, [t, devices, deviceFilter, selectDevice])

  const renderEntry = useCallback(
    (entry: ActivityEntry) => (
      <ActivityRow
        key={entry.id}
        entry={entry}
        expanded={expandedId === entry.id}
        onToggle={toggleExpanded}
      />
    ),
    [expandedId, toggleExpanded],
  )

  const renderGroup = useCallback(
    (group: ActivityGroup) => (
      <RNView key={group.key} style={styles.group}>
        <Text style={commonThemedStyles.settingsSectionCap}>{formatActivityDay(group.at, t)}</Text>
        <RNView style={styles.groupRows}>{group.entries.map(renderEntry)}</RNView>
      </RNView>
    ),
    [styles, commonThemedStyles, t, renderEntry],
  )

  const retentionLabel =
    getActivityRetentionOptions(t).find((option) => option.value === String(retentionDays))
      ?.label ?? ''
  const filterLabel =
    getActivityFilterOptions(t).find((option) => option.value === filter)?.label ?? ''
  const deviceLabel =
    getActivityDeviceOptions(devices, t).find((option) => option.value === deviceFilter)?.label ??
    t('activity.filters.anyDevice')

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={commonStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <RNView style={styles.screen}>
        <MotionView
          entering={FadeInDown.duration(Durations.slide).delay(Durations.delayShort)}
          layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
        >
          <RNView style={commonThemedStyles.card}>
            <RNView style={styles.toggleRow}>
              <RNView style={commonStyles.flex1}>
                <Text style={styles.rowTitle}>{t('activity.settings.record')}</Text>
                <Text style={styles.rowDesc}>{t('activity.settings.recordDesc')}</Text>
              </RNView>
              <Switch
                value={enabled}
                onValueChange={toggleEnabled}
                trackColor={{ false: colors.borderSecondary, true: colors.primary }}
                thumbColor={colors.white}
              />
            </RNView>

            <RNView style={styles.divider} />

            <Pressable
              onPress={handleRetentionPress}
              disabled={!enabled}
              style={({ pressed }) => [
                styles.navRow,
                !enabled && styles.rowDisabled,
                pressed && commonStyles.pressed,
              ]}
            >
              <RNView style={commonStyles.flex1}>
                <Text style={styles.rowTitle}>{t('activity.settings.retention')}</Text>
                <Text style={styles.rowDesc}>{t('activity.settings.retentionDesc')}</Text>
              </RNView>
              <RNView style={commonStyles.settingsRowRight}>
                <Text style={styles.rowValue}>{retentionLabel}</Text>
                <SymbolIcon
                  name="chevron.forward"
                  size={UI_ICON_SIZE_15}
                  color={colors.textMuted}
                />
              </RNView>
            </Pressable>
          </RNView>
        </MotionView>

        <MotionView
          entering={FadeInDown.duration(Durations.slide).delay(Durations.delayShort)}
          layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
        >
          <RNView style={commonThemedStyles.card}>
            <RNView style={styles.noticeRow}>
              <SymbolIcon name="info.circle" size={UI_ICON_SIZE_15} color={colors.primary} />
              <Text style={styles.noticeText}>{t('activity.settings.syncNotice')}</Text>
            </RNView>
          </RNView>
        </MotionView>

        <MotionView
          entering={FadeInDown.duration(Durations.slide).delay(Durations.delayMedium)}
          layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
        >
          <RNView style={commonThemedStyles.card}>
            <RNView style={styles.clearRow}>
              <RNView style={commonStyles.flex1}>
                <Text style={styles.rowTitle}>{t('activity.settings.clear')}</Text>
                <Text style={styles.rowDesc}>
                  {confirmingClear
                    ? t('activity.settings.clearConfirm')
                    : t('activity.settings.stored', {
                        count: stats.count,
                        size: formatBytes(stats.bytes),
                      })}
                </Text>
              </RNView>
            </RNView>
            <RNView style={styles.clearActions}>
              {confirmingClear ? (
                <Pressable
                  onPress={cancelClear}
                  style={({ pressed }) => [styles.secondaryBtn, pressed && commonStyles.pressed]}
                >
                  <Text style={styles.secondaryBtnText}>{t('common.cancel')}</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={confirmingClear ? confirmClear : requestClear}
                disabled={isClearing || stats.count === 0}
                style={({ pressed }) => [
                  styles.dangerBtn,
                  (isClearing || stats.count === 0) && styles.rowDisabled,
                  pressed && commonStyles.pressed,
                ]}
              >
                <Text style={styles.dangerBtnText}>
                  {confirmingClear ? t('activity.settings.clearYes') : t('activity.settings.clear')}
                </Text>
              </Pressable>
            </RNView>
          </RNView>
        </MotionView>

        <RNView style={styles.filterRow}>
          <Pressable
            onPress={handleFilterPress}
            style={({ pressed }) => [styles.chip, pressed && commonStyles.pressed]}
          >
            <Text style={styles.chipText}>{filterLabel}</Text>
            <SymbolIcon name="chevron.down" size={UI_ICON_SIZE_15} color={colors.textMuted} />
          </Pressable>
          <Pressable
            onPress={handleDevicePress}
            style={({ pressed }) => [styles.chip, pressed && commonStyles.pressed]}
          >
            <Text style={styles.chipText}>{deviceLabel}</Text>
            <SymbolIcon name="chevron.down" size={UI_ICON_SIZE_15} color={colors.textMuted} />
          </Pressable>
        </RNView>

        {isEmpty ? (
          <RNView style={styles.empty}>
            <RNView style={styles.emptyIcon}>
              <SymbolIcon
                name="clock.arrow.circlepath"
                size={UI_ICON_SIZE_20}
                color={colors.textMuted}
              />
            </RNView>
            <Text style={styles.emptyTitle}>
              {enabled ? t('activity.empty.title') : t('activity.empty.disabledTitle')}
            </Text>
            <Text style={styles.emptyDesc}>
              {enabled ? t('activity.empty.description') : t('activity.empty.disabledDescription')}
            </Text>
          </RNView>
        ) : (
          <RNView style={styles.groups}>{groups.map(renderGroup)}</RNView>
        )}

        {hasMore ? (
          <Pressable
            onPress={loadMore}
            disabled={isLoadingMore}
            style={({ pressed }) => [styles.loadMore, pressed && commonStyles.pressed]}
          >
            <Text style={styles.loadMoreText}>
              {isLoadingMore ? t('common.loading') : t('activity.loadMore')}
            </Text>
          </Pressable>
        ) : null}
      </RNView>
    </ScrollView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const rowBase = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Space.md,
    padding: Space.lg,
  }

  const styles = StyleSheet.create({
    screen: {
      paddingHorizontal: Space.base,
      gap: Space.lg,
    },
    toggleRow: rowBase,
    navRow: rowBase,
    clearRow: rowBase,
    rowDisabled: {
      opacity: 0.4,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.borderSecondary,
      marginLeft: Space.lg,
    },
    rowTitle: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    rowDesc: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
      marginTop: UI_SIZE_2,
      lineHeight: FontSize.body * 1.4,
    },
    rowValue: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.medium,
      color: theme.colors.textMuted,
    },
    noticeRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Space.sm,
      padding: Space.lg,
      backgroundColor: theme.colors.cardSelected,
    },
    noticeText: {
      flex: 1,
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.textSecondary,
      lineHeight: FontSize.caption * 1.5,
    },
    clearActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: Space.sm,
      paddingHorizontal: Space.lg,
      paddingBottom: Space.lg,
    },
    secondaryBtn: {
      paddingHorizontal: Space.base,
      paddingVertical: Space.sm,
      borderRadius: Radii.sm,
      backgroundColor: theme.colors.controlBackground,
    },
    secondaryBtnText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    dangerBtn: {
      paddingHorizontal: Space.base,
      paddingVertical: Space.sm,
      borderRadius: Radii.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.error,
    },
    dangerBtnText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.error,
    },
    filterRow: {
      flexDirection: 'row',
      gap: Space.sm,
      flexWrap: 'wrap',
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.xs,
      paddingHorizontal: Space.md,
      paddingVertical: Space.sm,
      borderRadius: Radii.pill,
      backgroundColor: theme.colors.controlBackground,
    },
    chipText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    groups: {
      gap: Space.lg,
    },
    group: {
      gap: Space.sm,
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
    loadMore: {
      height: UI_SIZE_40,
      borderRadius: Radii.md,
      backgroundColor: theme.colors.controlBackground,
      ...commonStyles.centered,
    },
    loadMoreText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
  })
  return styles
})
