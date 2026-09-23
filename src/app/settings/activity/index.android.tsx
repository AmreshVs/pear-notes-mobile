import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Switch } from 'react-native-paper'
import { Easing, LinearTransition } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router, Stack } from 'expo-router'

import { formatBytes } from '@pear-notes/core/utils.js'

import { ActivityRow } from '@/components/activity/ActivityRow'
import { BottomActionSheet } from '@/components/android/BottomActionSheet'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { MotionView } from '@/components/MotionView'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_18,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_24,
  UI_ICON_SIZE_36,
  UI_SIZE_2,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_28,
  UI_SIZE_44,
  UI_SIZE_48,
  UI_SIZE_72,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'
import {
  type ActivityEntry,
  type ActivityGroup,
  formatActivityDay,
  getActivityDeviceOptions,
} from '@/utils/activityUtils'
import { getActivityFilterOptions, getActivityRetentionOptions } from '@/utils/settingsUtils'

import { useActivityScreen } from './useActivityScreen'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  surfaceContainerHighest?: string
  primaryContainer?: string
  onPrimaryContainer?: string
  onSurfaceVariant?: string
}

const rippleBorderless = { borderless: true }

export default function ActivityScreenAndroid() {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
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
    hasLinkedDevices,
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

  const [retentionSheetVisible, setRetentionSheetVisible] = useState(false)
  const [filterSheetVisible, setFilterSheetVisible] = useState(false)
  const [deviceSheetVisible, setDeviceSheetVisible] = useState(false)

  const handleBack = useCallback(() => router.back(), [])

  const retentionActions = useMemo(
    () =>
      getActivityRetentionOptions(t).map((option) => ({
        icon: 'clock-outline',
        label: option.label,
        noRightIcon: option.value !== String(retentionDays),
        selected: option.value === String(retentionDays),
        onPress: () => {
          selectRetention(Number(option.value))
          setRetentionSheetVisible(false)
        },
      })),
    [t, retentionDays, selectRetention],
  )

  const filterActions = useMemo(
    () =>
      getActivityFilterOptions(t).map((option) => ({
        icon: 'filter-variant',
        label: option.label,
        selected: option.value === filter,
        onPress: () => {
          selectFilter(option.value)
          setFilterSheetVisible(false)
        },
      })),
    [t, filter, selectFilter],
  )

  const deviceActions = useMemo(
    () =>
      getActivityDeviceOptions(devices, t).map((option) => ({
        icon: 'devices',
        label: option.label,
        selected: option.value === deviceFilter,
        onPress: () => {
          selectDevice(option.value)
          setDeviceSheetVisible(false)
        },
      })),
    [t, devices, deviceFilter, selectDevice],
  )

  const openRetentionSheet = useCallback(() => setRetentionSheetVisible(true), [])
  const dismissRetentionSheet = useCallback(() => setRetentionSheetVisible(false), [])
  const openFilterSheet = useCallback(() => setFilterSheetVisible(true), [])
  const dismissFilterSheet = useCallback(() => setFilterSheetVisible(false), [])
  const openDeviceSheet = useCallback(() => setDeviceSheetVisible(true), [])
  const dismissDeviceSheet = useCallback(() => setDeviceSheetVisible(false), [])

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
      <View key={group.key} style={styles.group}>
        <Text style={styles.groupTitle}>{formatActivityDay(group.at, t)}</Text>
        <View style={styles.groupRows}>{group.entries.map(renderEntry)}</View>
      </View>
    ),
    [styles, t, renderEntry],
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
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          android_ripple={rippleBorderless}
          hitSlop={UI_SIZE_12}
          style={styles.iconBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={UI_ICON_SIZE_24} color={c.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('layouts.activity')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <MotionView
          layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
          style={[styles.card, !hasLinkedDevices && styles.disabledBlock]}
          pointerEvents={hasLinkedDevices ? 'auto' : 'none'}
        >
          <View style={styles.toggleRow}>
            <View style={commonStyles.flex1}>
              <Text style={styles.rowTitle}>{t('activity.settings.record')}</Text>
              <Text style={styles.rowDesc}>{t('activity.settings.recordDesc')}</Text>
            </View>
            <Switch value={enabled} onValueChange={toggleEnabled} color={c.primary} />
          </View>
          <View style={styles.divider} />
          <Pressable
            onPress={openRetentionSheet}
            disabled={!enabled}
            style={({ pressed }) => [
              styles.navRow,
              !enabled && styles.disabled,
              pressed && styles.pressedRow,
            ]}
          >
            <View style={commonStyles.flex1}>
              <Text style={styles.rowTitle}>{t('activity.settings.retention')}</Text>
              <Text style={styles.rowDesc}>{t('activity.settings.retentionDesc')}</Text>
            </View>
            <Text style={styles.rowValue}>{retentionLabel}</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={UI_ICON_SIZE_18}
              color={c.onSurfaceVariant}
            />
          </Pressable>
        </MotionView>

        <View style={styles.notice}>
          <MaterialCommunityIcons
            name="information-outline"
            size={UI_ICON_SIZE_20}
            color={c.primary}
          />
          <Text style={styles.noticeText}>{t('activity.settings.syncNotice')}</Text>
        </View>

        <MotionView
          layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
          style={[styles.card, !hasLinkedDevices && styles.disabledBlock]}
          pointerEvents={hasLinkedDevices ? 'auto' : 'none'}
        >
          <View style={styles.toggleRow}>
            <View style={commonStyles.flex1}>
              <Text style={styles.rowTitle}>{t('activity.settings.clear')}</Text>
              <Text style={styles.rowDesc}>
                {confirmingClear
                  ? t('activity.settings.clearConfirm')
                  : t('activity.settings.stored', {
                      count: stats.count,
                      size: formatBytes(stats.bytes),
                    })}
              </Text>
            </View>
          </View>
          <View style={styles.clearActions}>
            {confirmingClear ? (
              <Pressable
                onPress={cancelClear}
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressedRow]}
              >
                <Text style={styles.secondaryBtnText}>{t('common.cancel')}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={confirmingClear ? confirmClear : requestClear}
              disabled={isClearing || stats.count === 0}
              style={({ pressed }) => [
                styles.dangerBtn,
                (isClearing || stats.count === 0) && styles.disabled,
                pressed && styles.pressedRow,
              ]}
            >
              <Text style={styles.dangerBtnText}>
                {confirmingClear ? t('activity.settings.clearYes') : t('activity.settings.clear')}
              </Text>
            </Pressable>
          </View>
        </MotionView>

        <View style={styles.filterRow}>
          <Pressable
            onPress={openFilterSheet}
            style={({ pressed }) => [styles.chip, pressed && styles.pressedRow]}
          >
            <Text style={styles.chipText}>{filterLabel}</Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={UI_ICON_SIZE_20}
              color={c.onSurfaceVariant}
            />
          </Pressable>
          <Pressable
            onPress={openDeviceSheet}
            style={({ pressed }) => [styles.chip, pressed && styles.pressedRow]}
          >
            <Text style={styles.chipText}>{deviceLabel}</Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={UI_ICON_SIZE_20}
              color={c.onSurfaceVariant}
            />
          </Pressable>
        </View>

        {isEmpty ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons
                name="history"
                size={UI_ICON_SIZE_36}
                color={c.onSurfaceVariant}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {!hasLinkedDevices
                ? t('activity.empty.noDevicesTitle')
                : enabled
                  ? t('activity.empty.title')
                  : t('activity.empty.disabledTitle')}
            </Text>
            <Text style={styles.emptyDesc}>
              {!hasLinkedDevices
                ? t('activity.empty.noDevicesDescription')
                : enabled
                  ? t('activity.empty.description')
                  : t('activity.empty.disabledDescription')}
            </Text>
          </View>
        ) : (
          <View style={styles.groups}>{groups.map(renderGroup)}</View>
        )}

        {hasMore ? (
          <Pressable
            onPress={loadMore}
            disabled={isLoadingMore}
            style={({ pressed }) => [styles.loadMore, pressed && styles.pressedRow]}
          >
            <Text style={styles.loadMoreText}>
              {isLoadingMore ? t('common.loading') : t('activity.loadMore')}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <BottomActionSheet
        visible={retentionSheetVisible}
        onDismiss={dismissRetentionSheet}
        title={t('activity.settings.retention')}
        actions={retentionActions}
      />
      <BottomActionSheet
        visible={filterSheetVisible}
        onDismiss={dismissFilterSheet}
        title={t('activity.timeline')}
        actions={filterActions}
      />
      <BottomActionSheet
        visible={deviceSheetVisible}
        onDismiss={dismissDeviceSheet}
        title={t('activity.filters.anyDevice')}
        actions={deviceActions}
      />
    </View>
  )
}

const useActivityHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3, insets }) => {
  const c = md3.colors as ExtendedColors

  const rowBase = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Space.md,
    padding: Space.base,
  }

  const styles = StyleSheet.create({
    disabledBlock: {
      opacity: 0.5,
    },
    root: {
      ...commonStyles.flex1,
      backgroundColor: c.background,
      paddingBottom: Space.lg,
    },
    header: {
      ...commonStyles.row,
      paddingTop: insets.top + UI_SIZE_16,
      paddingHorizontal: UI_SIZE_20,
      gap: UI_SIZE_16,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginHorizontal: Space.base,
      backgroundColor: theme.colors.border,
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
    scrollContent: {
      padding: Space.base,
      gap: Space.md,
    },
    card: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      overflow: 'hidden',
    },
    toggleRow: rowBase,
    navRow: rowBase,
    pressedRow: {
      backgroundColor: hexWithAlpha(c.onSurface, 0.08),
    },
    disabled: {
      opacity: 0.4,
    },
    rowTitle: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurface,
    },
    rowDesc: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      marginTop: UI_SIZE_2,
      lineHeight: FontSize.body * 1.4,
    },
    rowValue: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.medium,
      color: c.onSurfaceVariant,
    },
    notice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Space.md,
      padding: Space.base,
      borderRadius: UI_SIZE_28,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
    },
    noticeText: {
      flex: 1,
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurface,
      lineHeight: FontSize.caption * 1.5,
    },
    clearActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: Space.sm,
      padding: Space.base,
    },
    secondaryBtn: {
      paddingHorizontal: Space.base,
      height: UI_SIZE_44,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.onSurface, 0.08),
      ...commonStyles.centered,
    },
    secondaryBtnText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurface,
    },
    dangerBtn: {
      paddingHorizontal: UI_SIZE_20,
      height: UI_SIZE_44,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.error, 0.12),
      ...commonStyles.centered,
    },
    dangerBtnText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.error,
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
      paddingHorizontal: UI_SIZE_16,
      height: UI_SIZE_44,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.onSurface, 0.08),
    },
    chipText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurface,
    },
    groups: {
      gap: UI_SIZE_20,
    },
    group: {
      gap: Space.sm,
    },
    groupTitle: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onSurface,
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
    loadMore: {
      height: UI_SIZE_48,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.onSurface, 0.08),
      ...commonStyles.centered,
    },
    loadMoreText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurface,
    },
  })
  return styles
}, useActivityHooks)
