import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import { useSelector } from 'react-redux'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { getSyncLeaderPlan } from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import { getDeviceDisplayName } from '@pear-notes/core/utils.js'

import { AndroidIndexerDialog } from '@/components/android/AndroidIndexerDialog'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { syncLeaderLine } from '@/components/sync/syncLeaderLine'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  UI_ICON_SIZE_12,
  UI_ICON_SIZE_18,
  UI_SIZE_2,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_17,
  UI_SIZE_24,
} from '@/constants/commonStyles'
import { useDeviceIndexer } from '@/hooks/useDeviceIndexer'
import { androidRipple } from '@/lib/androidRipple'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  onSurfaceVariant?: string
}

export function AndroidSyncLeadersNotes() {
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const plan = useSelector(getSyncLeaderPlan) as any
  const suggested = plan.suggested
  const suggestedFlow = useDeviceIndexer(suggested)
  const offlineNames = plan.offlineLeaders.map(getDeviceDisplayName).join(', ')
  const suggestedName = suggested ? getDeviceDisplayName(suggested) : ''
  const leaderLine = syncLeaderLine(plan, t)

  return (
    <>
      {!!leaderLine && (
        <View style={styles.row}>
          <MaterialCommunityIcons
            name="crown-outline"
            size={UI_ICON_SIZE_12}
            color={c.primary}
            style={styles.icon}
          />
          <Text style={[styles.note, commonStyles.flex1]}>{leaderLine}</Text>
        </View>
      )}

      {plan.needsBothOnline && (
        <View style={styles.row}>
          <MaterialCommunityIcons
            name="alert-outline"
            size={UI_ICON_SIZE_12}
            color={c.onSurfaceVariant}
            style={styles.icon}
          />
          <Text style={[styles.note, commonStyles.flex1]}>
            {t('sync.devices.leadersTwoWarning')}
          </Text>
        </View>
      )}

      {!!offlineNames && (
        <View style={styles.row}>
          <MaterialCommunityIcons
            name="alert-outline"
            size={UI_ICON_SIZE_12}
            color={c.onSurfaceVariant}
            style={styles.icon}
          />
          <Text style={[styles.note, commonStyles.flex1]}>
            {t('sync.devices.indexerOfflineNotice', { name: offlineNames })}
          </Text>
        </View>
      )}

      {suggested && !suggestedFlow.isTransferring && (
        <Pressable
          onPress={suggestedFlow.openAdd}
          android_ripple={ripple}
          style={styles.suggestion}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="crown-outline" size={UI_ICON_SIZE_18} color={c.primary} />
          <View style={commonStyles.flex1}>
            <Text style={styles.suggestionTitle} numberOfLines={1}>
              {t('sync.devices.leadersSuggest', { name: suggestedName })}
            </Text>
            <Text style={styles.note}>{t('sync.devices.leadersSuggestHint')}</Text>
          </View>
        </Pressable>
      )}

      <AndroidIndexerDialog
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

const useHooks = () => ({ md3: useMD3Theme() })

const useStyles = createThemedStylesheetWithHooks((_theme, { md3 }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    row: {
      ...commonStyles.row,
      alignItems: 'flex-start',
      gap: UI_SIZE_8,
      marginTop: UI_SIZE_24,
    },
    icon: {
      marginTop: UI_SIZE_2,
    },
    note: {
      fontSize: FontSize.caption,
      lineHeight: UI_SIZE_17,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    suggestion: {
      ...commonStyles.row,
      alignItems: 'center',
      gap: UI_SIZE_12,
      marginTop: UI_SIZE_16,
      padding: UI_SIZE_16,
      borderRadius: UI_SIZE_16,
      overflow: 'hidden',
      backgroundColor: c.surfaceContainerHigh || c.surface,
    },
    suggestionTitle: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.medium,
      color: c.onSurface,
    },
  })
  return styles
}, useHooks)
