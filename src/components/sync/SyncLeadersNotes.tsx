import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View as RNView } from 'react-native'
import { useSelector } from 'react-redux'

import { getSyncLeaderPlan } from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import { getDeviceDisplayName } from '@pear-notes/core/utils.js'

import { SymbolIcon } from '@/components/SymbolIcon'
import { SyncIndexerModal } from '@/components/sync/SyncIndexerModal'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_13,
  UI_ICON_SIZE_16,
} from '@/constants/commonStyles'
import { useDeviceIndexer } from '@/hooks/useDeviceIndexer'

type Props = {
  showSuggestion?: boolean
}

export function SyncLeadersNotes({ showSuggestion = true }: Props) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const plan = useSelector(getSyncLeaderPlan) as any
  const suggested = plan.suggested
  const suggestedFlow = useDeviceIndexer(suggested)
  const offlineNames = plan.offlineLeaders.map(getDeviceDisplayName).join(', ')
  const suggestedName = suggested ? getDeviceDisplayName(suggested) : ''

  return (
    <>
      <RNView style={styles.row}>
        <SymbolIcon
          name="crown"
          size={UI_ICON_SIZE_13}
          color={colors.primary}
          style={styles.icon}
        />
        <RNView style={commonStyles.flex1}>
          <Text style={styles.summary}>
            {t('sync.devices.leadersSummary', { count: plan.leaderCount, max: plan.max })}
            {' · '}
            {t('sync.devices.leadersRecommended', { count: plan.recommended })}
          </Text>
          <Text style={styles.explain}>{t('sync.devices.indexerExplain')}</Text>
        </RNView>
      </RNView>

      {plan.needsBothOnline && (
        <RNView style={styles.row}>
          <SymbolIcon
            name="exclamationmark.triangle"
            size={UI_ICON_SIZE_13}
            color={colors.textMuted}
            style={styles.icon}
          />
          <Text style={styles.note}>{t('sync.devices.leadersTwoWarning')}</Text>
        </RNView>
      )}

      {!!offlineNames && (
        <RNView style={styles.row}>
          <SymbolIcon
            name="exclamationmark.triangle"
            size={UI_ICON_SIZE_13}
            color={colors.textMuted}
            style={styles.icon}
          />
          <Text style={styles.note}>
            {t('sync.devices.indexerOfflineNotice', { name: offlineNames })}
          </Text>
        </RNView>
      )}

      {showSuggestion && suggested && !suggestedFlow.isTransferring && (
        <Pressable
          onPress={suggestedFlow.openAdd}
          style={({ pressed }) => [styles.suggestion, pressed && commonStyles.pressed]}
          accessibilityRole="button"
        >
          <SymbolIcon name="crown" size={UI_ICON_SIZE_16} color={colors.primary} />
          <RNView style={commonStyles.flex1}>
            <Text style={styles.suggestionTitle} numberOfLines={1}>
              {t('sync.devices.leadersSuggest', { name: suggestedName })}
            </Text>
            <Text style={styles.suggestionHint}>{t('sync.devices.leadersSuggestHint')}</Text>
          </RNView>
        </Pressable>
      )}

      <SyncIndexerModal
        visible={!!suggestedFlow.confirmMode}
        mode="add"
        deviceName={suggestedName}
        isLocalTarget={suggestedFlow.isLocalTarget}
        onCancel={suggestedFlow.closeConfirm}
        onConfirm={suggestedFlow.confirmChange}
      />
    </>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Space.sm,
      marginTop: Space.xl,
    },
    icon: {
      marginTop: 1,
    },
    summary: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      lineHeight: 20,
      marginBottom: Space.xs,
      color: theme.colors.text,
    },
    note: {
      fontSize: FontSize.body,
      flex: 1,
      lineHeight: 20,
      color: theme.colors.textMuted,
    },
    explain: {
      fontSize: FontSize.body,
      lineHeight: 20,
      color: theme.colors.textMuted,
    },
    suggestion: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.md,
      marginTop: Space.lg,
      padding: Space.md,
      borderRadius: Radii.card,
      backgroundColor: theme.colors.cardSurface,
    },
    suggestionTitle: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    suggestionHint: {
      fontSize: FontSize.caption,
      lineHeight: 18,
      marginTop: 2,
      color: theme.colors.textMuted,
    },
  })
  return styles
})
