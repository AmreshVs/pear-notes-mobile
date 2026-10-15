import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { BottomActionSheet, type SheetAction } from '@/components/android/BottomActionSheet'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import type {
  AttachmentFilter,
  AttachmentGroupBy,
} from '@/components/attachments/attachments.types'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_18,
  UI_ICON_SIZE_20,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_36,
  UI_SIZE_52,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

type Props = {
  query: string
  onQueryChange: (query: string) => void
  kind: AttachmentFilter
  onKindChange: (kind: AttachmentFilter) => void
  by: AttachmentGroupBy
  onByChange: (by: AttachmentGroupBy) => void
  counts: Record<AttachmentFilter, number>
}

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
}

type MaterialIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name']

const FILTERS: AttachmentFilter[] = ['all', 'photo', 'pdf', 'audio', 'file']
const GROUPS: AttachmentGroupBy[] = ['folder', 'type', 'month']

const FILTER_ICONS: Record<string, MaterialIconName> = {
  photo: 'image-outline',
  pdf: 'file-document-outline',
  audio: 'microphone-outline',
  file: 'file-outline',
}

const GROUP_ICONS: Record<AttachmentGroupBy, string> = {
  folder: 'folder-outline',
  type: 'shape-outline',
  month: 'calendar-month-outline',
}

type ChipProps = {
  value: AttachmentFilter
  label: string
  count: number
  active: boolean
  onPress: (value: AttachmentFilter) => void
}

const FilterChip = memo(function FilterChip({ value, label, count, active, onPress }: ChipProps) {
  const styles = useStyles()
  const { colors } = useMD3Theme()
  const c = colors as ExtendedColors
  const ripple = useMemo(() => androidRipple(colors.onSurface), [colors.onSurface])
  const handlePress = useCallback(() => onPress(value), [onPress, value])
  const accessibilityState = useMemo(() => ({ selected: active }), [active])
  const icon = FILTER_ICONS[value]
  return (
    <Pressable
      onPress={handlePress}
      android_ripple={ripple}
      accessibilityRole="button"
      accessibilityLabel={icon ? `${label} ${count}` : label}
      accessibilityState={accessibilityState}
      style={[styles.chip, active && styles.chipActive]}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon}
          size={UI_ICON_SIZE_16}
          color={active ? c.onPrimaryContainer : c.onSurfaceVariant}
        />
      )}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{icon ? count : label}</Text>
    </Pressable>
  )
})

export function AttachmentsFilters({
  query,
  onQueryChange,
  kind,
  onKindChange,
  by,
  onByChange,
  counts,
}: Props) {
  const { t } = useTranslation()
  const { colors } = useMD3Theme()
  const styles = useStyles()
  const ripple = useMemo(() => androidRipple(colors.onSurface), [colors.onSurface])
  const [groupSheetOpen, setGroupSheetOpen] = useState(false)
  const handleClear = useCallback(() => onQueryChange(''), [onQueryChange])
  const openGroupSheet = useCallback(() => setGroupSheetOpen(true), [])
  const closeGroupSheet = useCallback(() => setGroupSheetOpen(false), [])

  const visibleFilters = useMemo(
    () => FILTERS.filter((value) => value === 'all' || value === kind || (counts[value] ?? 0) > 0),
    [kind, counts],
  )

  const selectGroup = useCallback(
    (value: AttachmentGroupBy) => {
      onByChange(value)
      setGroupSheetOpen(false)
    },
    [onByChange],
  )

  const groupActions = useMemo<SheetAction[]>(
    () =>
      GROUPS.map((value) => ({
        icon: GROUP_ICONS[value],
        label: t(`attachmentsView.group.${value}`),
        selected: by === value,
        noRightIcon: true,
        onPress: () => selectGroup(value),
      })),
    [t, by, selectGroup],
  )

  const renderChip = useCallback(
    (value: AttachmentFilter) => (
      <FilterChip
        key={value}
        value={value}
        label={t(`attachmentsView.filter.${value}`)}
        count={counts[value] ?? 0}
        active={kind === value}
        onPress={onKindChange}
      />
    ),
    [kind, onKindChange, counts, t],
  )

  return (
    <View style={styles.container}>
      <View style={styles.search}>
        <MaterialCommunityIcons
          name="magnify"
          size={UI_ICON_SIZE_20}
          color={colors.onSurfaceVariant}
        />
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder={t('attachmentsView.searchPlaceholder')}
          placeholderTextColor={colors.onSurfaceVariant}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel={t('attachmentsView.searchPlaceholder')}
          style={styles.searchInput}
        />
        {query.length > 0 && (
          <Pressable
            onPress={handleClear}
            android_ripple={ripple}
            hitSlop={UI_SIZE_8}
            accessibilityRole="button"
            accessibilityLabel={t('common.clear')}
            style={styles.clear}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={UI_ICON_SIZE_18}
              color={colors.onSurfaceVariant}
            />
          </Pressable>
        )}
      </View>
      <View style={styles.row}>
        <View style={styles.chips}>{visibleFilters.map(renderChip)}</View>
        <Pressable
          onPress={openGroupSheet}
          android_ripple={ripple}
          accessibilityRole="button"
          accessibilityHint={t('attachmentsView.groupBy')}
          style={styles.group}
        >
          <Text style={styles.groupText}>{t(`attachmentsView.byGroup.${by}`)}</Text>
          <MaterialCommunityIcons
            name="chevron-down"
            size={UI_ICON_SIZE_18}
            color={colors.onSurfaceVariant}
          />
        </Pressable>
      </View>
      <BottomActionSheet
        visible={groupSheetOpen}
        onDismiss={closeGroupSheet}
        title={t('attachmentsView.groupBy')}
        showHeader
        actions={groupActions}
      />
    </View>
  )
}

const useStyles = createThemedStylesheetWithHooks((_theme, md3) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    container: {
      gap: UI_SIZE_12,
      marginBottom: UI_SIZE_4,
    },
    search: {
      ...commonStyles.row,
      gap: UI_SIZE_8,
      minHeight: UI_SIZE_52,
      marginHorizontal: UI_SIZE_16,
      paddingHorizontal: UI_SIZE_16,
      borderRadius: UI_SIZE_9999,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
    },
    searchInput: {
      ...commonStyles.flex1,
      paddingVertical: UI_SIZE_12,
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.regular,
      color: c.onSurface,
    },
    clear: {
      overflow: 'hidden',
      borderRadius: UI_SIZE_9999,
    },
    row: {
      ...commonStyles.row,
      gap: UI_SIZE_8,
      marginHorizontal: UI_SIZE_16,
    },
    chips: {
      ...commonStyles.row,
      ...commonStyles.flex1,
      flexWrap: 'wrap',
      gap: UI_SIZE_6,
    },
    chip: {
      ...commonStyles.row,
      overflow: 'hidden',
      gap: UI_SIZE_6,
      height: UI_SIZE_36,
      paddingHorizontal: UI_SIZE_12,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.onSurface, 0.04),
    },
    chipActive: {
      backgroundColor: c.primaryContainer,
    },
    chipText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurfaceVariant,
      fontVariant: ['tabular-nums'],
    },
    chipTextActive: {
      color: c.onPrimaryContainer,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
    },
    group: {
      ...commonStyles.row,
      overflow: 'hidden',
      gap: UI_SIZE_4,
      height: UI_SIZE_36,
      paddingHorizontal: UI_SIZE_8,
      borderRadius: UI_SIZE_9999,
    },
    groupText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurfaceVariant,
    },
  })
  return styles
}, useMD3Theme)
