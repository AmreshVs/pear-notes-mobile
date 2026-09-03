import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_18,
  UI_SIZE_2,
  UI_SIZE_28,
  UI_SIZE_36,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'
import { type ActivityEntry } from '@/utils/activityUtils'

import { ActivityDiff } from './ActivityDiff'
import { useActivityRow } from './useActivityRow'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  primaryContainer?: string
  onSurfaceVariant?: string
}

type Props = {
  entry: ActivityEntry
  expanded: boolean
  showTarget?: boolean
  onToggle: (id: string) => void
}

export function ActivityRow({ entry, expanded, showTarget = true, onToggle }: Props) {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const { hidden, canExpand, diff, deviceName, isMobileDevice, message, timeLabel, requestDiff } =
    useActivityRow(entry, showTarget)

  const handlePress = useCallback(() => {
    if (!canExpand) return
    if (!expanded) requestDiff()
    onToggle(entry.id)
  }, [canExpand, expanded, requestDiff, onToggle, entry.id])

  return (
    <View style={styles.card}>
      <Pressable
        onPress={handlePress}
        disabled={!canExpand}
        android_ripple={canExpand ? undefined : null}
        accessibilityRole={canExpand ? 'button' : 'text'}
        accessibilityLabel={`${deviceName} ${message}`}
        style={({ pressed }) => [styles.row, pressed && canExpand && styles.rowPressed]}
      >
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons
            name={isMobileDevice ? 'cellphone' : 'laptop'}
            size={UI_ICON_SIZE_18}
            color={c.primary}
          />
        </View>

        <View style={commonStyles.flex1}>
          <Text style={styles.message}>
            <Text style={styles.device}>{deviceName}</Text>
            {` ${message}`}
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.meta}>{timeLabel}</Text>
            {entry.ops > 1 ? (
              <Text style={styles.meta}>{t('activity.saveCount', { count: entry.ops })}</Text>
            ) : null}
            {hidden ? (
              <View style={styles.lockBadge}>
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={UI_ICON_SIZE_16}
                  color={c.onSurfaceVariant}
                />
                <Text style={styles.meta}>{t('activity.locked')}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {canExpand ? (
          <MaterialCommunityIcons
            name={expanded ? 'chevron-down' : 'chevron-right'}
            size={UI_ICON_SIZE_18}
            color={c.onSurfaceVariant}
          />
        ) : null}
      </Pressable>

      {expanded ? (
        <View style={styles.diffWrap}>
          {diff?.available ? (
            <ActivityDiff before={diff.before} after={diff.after} />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.meta}>
                {diff ? t('activity.diff.unavailable') : t('activity.diff.loading')}
              </Text>
            </View>
          )}
        </View>
      ) : null}
    </View>
  )
}

const useRowHooks = () => {
  const md3 = useMD3Theme()
  return { md3 }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3 }) => {
  const c = md3.colors as ExtendedColors

  const styles = StyleSheet.create({
    card: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Space.md,
      padding: Space.base,
    },
    rowPressed: {
      backgroundColor: hexWithAlpha(c.onSurface, 0.08),
    },
    iconWrap: {
      width: UI_SIZE_36,
      height: UI_SIZE_36,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
      ...commonStyles.centered,
    },
    message: {
      fontFamily: FontFamily.regular,
      fontSize: FontSize.body,
      lineHeight: FontSize.body * 1.4,
      color: c.onSurfaceVariant,
    },
    device: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onSurface,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: Space.md,
      marginTop: UI_SIZE_2,
    },
    meta: {
      fontFamily: FontFamily.regular,
      fontSize: FontSize.caption,
      color: c.onSurfaceVariant,
    },
    lockBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.xs,
    },
    diffWrap: {
      paddingHorizontal: Space.base,
      paddingBottom: Space.base,
    },
    placeholder: {
      marginTop: Space.md,
      padding: Space.md,
      borderRadius: UI_SIZE_28,
      backgroundColor: hexWithAlpha(c.onSurface, 0.06),
    },
  })
  return styles
}, useRowHooks)
