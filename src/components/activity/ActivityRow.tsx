import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View as RNView } from 'react-native'

import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_14,
  UI_ICON_SIZE_16,
  UI_SIZE_2,
  UI_SIZE_32,
} from '@/constants/commonStyles'
import { type ActivityEntry } from '@/utils/activityUtils'

import { ActivityDiff } from './ActivityDiff'
import { useActivityRow } from './useActivityRow'

type Props = {
  entry: ActivityEntry
  expanded: boolean
  showTarget?: boolean
  onToggle: (id: string) => void
}

export function ActivityRow({ entry, expanded, showTarget = true, onToggle }: Props) {
  const { t } = useTranslation()
  const styles = useStyles()
  const { colors } = useTheme()
  const {
    hidden,
    canExpand,
    isDiscarded,
    canRecover,
    isRecovering,
    recover,
    diff,
    deviceName,
    isMobileDevice,
    message,
    timeLabel,
    requestDiff,
  } = useActivityRow(entry, showTarget)

  const handlePress = useCallback(() => {
    if (!canExpand) return
    if (!expanded) requestDiff()
    onToggle(entry.id)
  }, [canExpand, expanded, requestDiff, onToggle, entry.id])

  return (
    <RNView style={expanded ? styles.cardExpanded : styles.card}>
      <Pressable
        onPress={handlePress}
        disabled={!canExpand}
        accessibilityRole={canExpand ? 'button' : 'text'}
        accessibilityLabel={`${deviceName} ${message}`}
        style={({ pressed }) => [styles.row, pressed && canExpand && commonStyles.pressed]}
      >
        <RNView style={styles.iconBox}>
          <SymbolIcon
            name={isMobileDevice ? 'iphone' : 'laptopcomputer'}
            size={UI_ICON_SIZE_16}
            color={colors.textMuted}
          />
        </RNView>

        <RNView style={commonStyles.flex1}>
          <Text style={styles.message}>
            <Text style={styles.device}>{deviceName}</Text>
            {` ${message}`}
          </Text>

          <RNView style={styles.metaRow}>
            <Text style={styles.meta}>{timeLabel}</Text>
            {entry.ops > 1 ? (
              <Text style={styles.meta}>{t('activity.saveCount', { count: entry.ops })}</Text>
            ) : null}
            {hidden ? (
              <RNView style={styles.lockBadge}>
                <SymbolIcon name="lock.fill" size={UI_ICON_SIZE_14} color={colors.textMuted} />
                <Text style={styles.meta}>{t('activity.locked')}</Text>
              </RNView>
            ) : null}
          </RNView>
        </RNView>

        {canExpand ? (
          <SymbolIcon
            name={expanded ? 'chevron.down' : 'chevron.forward'}
            size={UI_ICON_SIZE_14}
            color={colors.textMuted}
          />
        ) : null}
      </Pressable>

      {expanded ? (
        <RNView style={styles.diffWrap}>
          {isDiscarded ? (
            <Text style={styles.explanation}>{t('activity.discarded.explanation')}</Text>
          ) : null}
          {diff?.available ? (
            <ActivityDiff before={diff.before} after={diff.after} />
          ) : (
            <RNView style={styles.placeholder}>
              <Text style={styles.meta}>
                {diff ? t('activity.diff.unavailable') : t('activity.diff.loading')}
              </Text>
            </RNView>
          )}
          {isDiscarded && canRecover ? (
            <Pressable
              onPress={recover}
              disabled={isRecovering}
              accessibilityRole="button"
              accessibilityLabel={t('activity.discarded.recover')}
              style={({ pressed }) => [styles.recoverBtn, pressed && commonStyles.pressed]}
            >
              <SymbolIcon
                name="arrow.uturn.backward"
                size={UI_ICON_SIZE_14}
                color={colors.primary}
              />
              <Text style={styles.recoverLabel}>
                {isRecovering
                  ? t('activity.discarded.recovering')
                  : t('activity.discarded.recover')}
              </Text>
            </Pressable>
          ) : null}
          {isDiscarded && !canRecover ? (
            <Text style={styles.meta}>{t('activity.discarded.recovered')}</Text>
          ) : null}
        </RNView>
      ) : null}
    </RNView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const cardBase = {
    backgroundColor: theme.colors.cardSurface,
    borderRadius: Radii.card,
    borderColor: theme.colors.borderSecondary,
    overflow: 'hidden' as const,
  }

  const styles = StyleSheet.create({
    card: {
      ...cardBase,
      borderColor: theme.colors.borderSecondary,
    },
    cardExpanded: {
      ...cardBase,
      borderColor: theme.colors.cardSelectedBorder,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Space.md,
      padding: Space.md,
    },
    iconBox: {
      width: UI_SIZE_32,
      height: UI_SIZE_32,
      borderRadius: Radii.sm,
      backgroundColor: theme.colors.controlBackground,
      ...commonStyles.centered,
    },
    message: {
      fontFamily: FontFamily.regular,
      fontSize: FontSize.body,
      lineHeight: FontSize.body * 1.4,
      color: theme.colors.textSecondary,
    },
    device: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
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
      color: theme.colors.textMuted,
    },
    lockBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.xs,
    },
    diffWrap: {
      paddingHorizontal: Space.md,
      paddingBottom: Space.md,
    },
    explanation: {
      fontFamily: FontFamily.regular,
      fontSize: FontSize.caption,
      lineHeight: FontSize.caption * 1.4,
      color: theme.colors.textMuted,
      marginBottom: Space.sm,
    },
    recoverBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: Space.xs,
      marginTop: Space.md,
      paddingVertical: Space.sm,
      paddingHorizontal: Space.md,
      borderRadius: Radii.pill,
      backgroundColor: theme.colors.controlBackground,
    },
    recoverLabel: {
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      fontSize: FontSize.caption,
      color: theme.colors.primary,
    },
    placeholder: {
      marginTop: Space.md,
      padding: Space.md,
      borderRadius: Radii.md,
      backgroundColor: theme.colors.controlBackground,
    },
  })
  return styles
})
