import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform, Pressable, StyleSheet, TextInput, View as RNView } from 'react-native'

import type {
  AttachmentFilter,
  AttachmentGroupBy,
} from '@/components/attachments/attachments.types'
import { SymbolIcon } from '@/components/SymbolIcon'
import type { IconName } from '@/components/SymbolIcon.types'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_12,
  UI_ICON_SIZE_14,
  UI_ICON_SIZE_15,
  UI_SIZE_9999,
} from '@/constants/commonStyles'

const ExpoUI: any = Platform.OS === 'ios' ? require('@expo/ui/swift-ui') : null

type Props = {
  query: string
  onQueryChange: (query: string) => void
  kind: AttachmentFilter
  onKindChange: (kind: AttachmentFilter) => void
  by: AttachmentGroupBy
  onByChange: (by: AttachmentGroupBy) => void
  counts: Record<AttachmentFilter, number>
}

const FILTERS: AttachmentFilter[] = ['all', 'photo', 'pdf', 'audio', 'file']
const GROUPS: AttachmentGroupBy[] = ['folder', 'type', 'month']

const FILTER_ICONS: Record<string, IconName> = {
  photo: 'photo',
  pdf: 'doc.richtext',
  audio: 'waveform',
  file: 'doc',
}

type ChipProps = {
  value: AttachmentFilter
  label: string
  count: number
  active: boolean
  onPress: (value: AttachmentFilter) => void
}

const FilterChip = memo(function FilterChip({ value, label, count, active, onPress }: ChipProps) {
  const { colors } = useTheme()
  const styles = useStyles()
  const handlePress = useCallback(() => onPress(value), [onPress, value])
  const accessibilityState = useMemo(() => ({ selected: active }), [active])
  const icon = FILTER_ICONS[value]
  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={icon ? `${label} ${count}` : label}
      accessibilityState={accessibilityState}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && commonStyles.pressed,
      ]}
    >
      {icon && (
        <SymbolIcon
          name={icon}
          size={UI_ICON_SIZE_14}
          color={active ? colors.primary : colors.textSecondary}
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
  const { colors } = useTheme()
  const styles = useStyles()

  const visibleFilters = useMemo(
    () => FILTERS.filter((value) => value === 'all' || value === kind || (counts[value] ?? 0) > 0),
    [kind, counts],
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
    <RNView style={styles.container}>
      <RNView style={styles.search}>
        <SymbolIcon name="magnifyingglass" size={UI_ICON_SIZE_15} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder={t('attachmentsView.searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          clearButtonMode="while-editing"
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel={t('attachmentsView.searchPlaceholder')}
          style={styles.searchInput}
        />
      </RNView>
      <RNView style={styles.row}>
        <RNView style={styles.chips}>{visibleFilters.map(renderChip)}</RNView>
        <ExpoUI.Host matchContents>
          <ExpoUI.Menu
            label={
              <ExpoUI.RNHostView matchContents>
                <RNView
                  style={styles.group}
                  accessibilityRole="button"
                  accessibilityHint={t('attachmentsView.groupBy')}
                >
                  <Text style={styles.groupText}>{t(`attachmentsView.byGroup.${by}`)}</Text>
                  <SymbolIcon
                    name="chevron.down"
                    size={UI_ICON_SIZE_12}
                    color={colors.textSecondary}
                    weight="semibold"
                  />
                </RNView>
              </ExpoUI.RNHostView>
            }
          >
            {GROUPS.map((value) => (
              <ExpoUI.Button
                key={value}
                label={t(`attachmentsView.group.${value}`)}
                systemImage={value === by ? 'checkmark' : undefined}
                onPress={() => onByChange(value)}
              />
            ))}
          </ExpoUI.Menu>
        </ExpoUI.Host>
      </RNView>
    </RNView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      gap: Space.md,
      marginBottom: Space.xs,
    },
    search: {
      ...commonStyles.row,
      gap: Space.sm,
      marginHorizontal: Space.base,
      paddingHorizontal: Space.md,
      borderRadius: Space.md,
      backgroundColor: theme.colors.controlBackground,
    },
    searchInput: {
      ...commonStyles.flex1,
      paddingVertical: Space.sm + 2,
      fontSize: FontSize.subtitle,
      color: theme.colors.text,
    },
    row: {
      ...commonStyles.row,
      gap: Space.sm,
      marginHorizontal: Space.base,
    },
    chips: {
      ...commonStyles.row,
      ...commonStyles.flex1,
      flexWrap: 'wrap',
      gap: Space.xs + 2,
    },
    chip: {
      ...commonStyles.row,
      gap: Space.xs + 1,
      paddingHorizontal: Space.md - 2,
      paddingVertical: Space.xs + 1,
      borderRadius: UI_SIZE_9999,
      backgroundColor: theme.colors.controlBackground,
    },
    chipActive: {
      backgroundColor: theme.colors.cardSelected,
    },
    chipText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      color: theme.colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    chipTextActive: {
      color: theme.colors.primary,
    },
    group: {
      ...commonStyles.row,
      gap: Space.xs,
      paddingHorizontal: Space.sm,
      paddingVertical: Space.xs + 1,
    },
    groupText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      color: theme.colors.textSecondary,
    },
  })
  return styles
})
