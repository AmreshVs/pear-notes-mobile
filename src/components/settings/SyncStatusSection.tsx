import { useTranslation } from 'react-i18next'
import { StyleSheet, View as RNView } from 'react-native'
import { FadeIn, FadeInDown } from 'react-native-reanimated'

import { SYNC_WAKE_RESULT } from '@pear-notes/core/constant.js'

import { MotionView } from '@/components/MotionView'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  Durations,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_14,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'

import { useSyncStatus } from './useSyncStatus'

const VERDICT_TONE = {
  ok: 'ok',
  noDevices: 'warn',
  neverSynced: 'warn',
  waiting: 'warn',
  serviceStopped: 'bad',
  backgroundStale: 'warn',
} as const

export function SyncStatusSection() {
  const { t } = useTranslation()
  const styles = useStyles()
  const { colors } = useTheme()
  const commonThemedStyles = useCommonThemedStyles()
  const {
    hasLinkedDevices,
    mode,
    lastSyncedRelative,
    lastReceived,
    lastWakeRelative,
    lastWakeResult,
    serviceFailedRelative,
    onlineNames,
    peerName,
    verdict,
  } = useSyncStatus()

  const tone = VERDICT_TONE[verdict]
  const verdictText = t(`settings.syncStatus.verdict.${verdict}`, { device: peerName })

  const wakeResultKey =
    lastWakeResult === SYNC_WAKE_RESULT.OK
      ? 'settings.syncStatus.wakeResultOk'
      : lastWakeResult === SYNC_WAKE_RESULT.NO_WORKLET
        ? 'settings.syncStatus.wakeResultNoWorklet'
        : lastWakeResult === SYNC_WAKE_RESULT.ERROR
          ? 'settings.syncStatus.wakeResultError'
          : ''

  const lastWakeLabel = lastWakeRelative
    ? t(lastWakeRelative.key, { count: lastWakeRelative.count })
    : t('settings.syncStatus.backgroundNever')

  const lastSyncedLabel = lastSyncedRelative
    ? t(lastSyncedRelative.key, { count: lastSyncedRelative.count })
    : t('settings.syncStatus.never')

  const receivedLabel =
    lastReceived > 0
      ? t('settings.syncStatus.receivedCount', { count: lastReceived })
      : t('settings.syncStatus.nothingNew')

  const onlineLabel =
    onlineNames.length > 0 ? onlineNames.join(', ') : t('settings.syncStatus.noneReachable')

  const glyphStyle =
    tone === 'ok' ? styles.glyphOk : tone === 'bad' ? styles.glyphBad : styles.glyphWarn

  return (
    <>
      <MotionView entering={FadeIn.duration(Durations.fade)}>
        <Text style={commonThemedStyles.settingsSectionCap}>{t('settings.syncStatus.title')}</Text>
      </MotionView>

      <MotionView entering={FadeInDown.duration(Durations.slide)}>
        <RNView style={commonThemedStyles.card}>
          {hasLinkedDevices && (
            <>
              <RNView style={styles.row}>
                <Text style={styles.rowKey}>{t('settings.syncStatus.lastSynced')}</Text>
                <Text style={styles.rowValue}>{lastSyncedLabel}</Text>
              </RNView>

              <RNView style={styles.row}>
                <Text style={styles.rowKey}>{t('settings.syncStatus.received')}</Text>
                <Text style={lastReceived > 0 ? styles.rowValue : styles.rowValueMuted}>
                  {receivedLabel}
                </Text>
              </RNView>

              {mode !== 'off' && (
                <>
                  <RNView style={styles.row}>
                    <Text style={styles.rowKey}>{t('settings.syncStatus.backgroundWake')}</Text>
                    <Text style={lastWakeRelative ? styles.rowValue : styles.rowValueMuted}>
                      {lastWakeLabel}
                    </Text>
                  </RNView>

                  {!!wakeResultKey && (
                    <RNView style={styles.row}>
                      <Text style={styles.rowKey}>{t('settings.syncStatus.wakeResult')}</Text>
                      <Text
                        style={
                          lastWakeResult === SYNC_WAKE_RESULT.OK
                            ? styles.rowValue
                            : styles.rowValueMuted
                        }
                      >
                        {t(wakeResultKey)}
                      </Text>
                    </RNView>
                  )}

                  {!!serviceFailedRelative && (
                    <RNView style={styles.row}>
                      <Text style={styles.rowKey}>{t('settings.syncStatus.serviceStoppedAt')}</Text>
                      <Text style={styles.rowValueMuted}>
                        {t(serviceFailedRelative.key, { count: serviceFailedRelative.count })}
                      </Text>
                    </RNView>
                  )}
                </>
              )}

              <RNView style={styles.rowLast}>
                <Text style={styles.rowKey}>{t('settings.syncStatus.devicesOnline')}</Text>
                <Text
                  numberOfLines={1}
                  style={onlineNames.length > 0 ? styles.rowValue : styles.rowValueMuted}
                >
                  {onlineLabel}
                </Text>
              </RNView>
            </>
          )}

          <RNView style={hasLinkedDevices ? styles.verdictDivided : styles.verdict}>
            <RNView style={[styles.glyph, glyphStyle]}>
              <SymbolIcon
                name={tone === 'ok' ? 'checkmark' : 'exclamationmark'}
                size={UI_ICON_SIZE_14}
                color={tone === 'ok' ? colors.surface : colors.onPrimary}
              />
            </RNView>
            <Text style={styles.verdictText}>{verdictText}</Text>
          </RNView>
        </RNView>
      </MotionView>
    </>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    row: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Space.md,
      paddingVertical: Space.md,
      marginHorizontal: Space.base,
      paddingHorizontal: Space.xs,
      borderBottomColor: theme.colors.border,
    },
    rowLast: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Space.md,
      paddingVertical: Space.md,
      paddingHorizontal: Space.lg,
    },
    rowKey: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.bold,
      color: theme.colors.textMuted,
    },
    rowValue: {
      flexShrink: 1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
      textAlign: 'right',
    },
    rowValueMuted: {
      flexShrink: 1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.bold,
      color: theme.colors.text,
      textAlign: 'right',
    },
    verdict: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Space.sm,
      padding: Space.lg,
    },
    verdictDivided: {
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Space.sm,
      padding: Space.lg,
      borderTopColor: theme.colors.border,
    },
    glyph: {
      width: 20,
      height: 20,
      borderRadius: Radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    glyphOk: {
      backgroundColor: theme.colors.success,
    },
    glyphWarn: {
      backgroundColor: theme.colors.primary,
    },
    glyphBad: {
      backgroundColor: theme.colors.error,
    },
    verdictText: {
      flex: 1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.textSecondary,
      lineHeight: FontSize.body * 1.45,
    },
  })
  return styles
})
