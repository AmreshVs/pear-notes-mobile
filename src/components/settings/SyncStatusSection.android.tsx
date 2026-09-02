import { useTranslation } from 'react-i18next'
import { StyleSheet, View as RNView } from 'react-native'
import { FadeIn, FadeInDown } from 'react-native-reanimated'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { MotionView } from '@/components/MotionView'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  Durations,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_14,
  UI_SIZE_20,
  UI_SIZE_28,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

import { useSyncStatus } from './useSyncStatus'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  onSurfaceVariant?: string
}

const useSectionHooks = () => ({
  md3: useMD3Theme(),
})

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
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const { hasLinkedDevices, lastSyncedRelative, lastReceived, onlineNames, peerName, verdict } =
    useSyncStatus()

  const tone = VERDICT_TONE[verdict]
  const verdictText = t(`settings.syncStatus.verdict.${verdict}`, { device: peerName })

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
        <Text style={styles.sectionCap}>{t('settings.syncStatus.title')}</Text>
      </MotionView>

      <MotionView entering={FadeInDown.duration(Durations.slide)}>
        <RNView style={styles.card}>
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
              <MaterialCommunityIcons
                name={tone === 'ok' ? 'check' : 'exclamation'}
                size={UI_ICON_SIZE_14}
                color={c.onPrimary}
              />
            </RNView>
            <Text style={styles.verdictText}>{verdictText}</Text>
          </RNView>
        </RNView>
      </MotionView>
    </>
  )
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3 }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    sectionCap: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurfaceVariant,
      paddingHorizontal: Space.xs,
      marginBottom: Space.sm,
    },
    card: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      overflow: 'hidden',
    },
    row: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Space.md,
      paddingVertical: Space.md,
      paddingHorizontal: Space.lg,
      borderBottomColor: hexWithAlpha(c.onSurface, 0.12),
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
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    rowValue: {
      flexShrink: 1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurface,
      textAlign: 'right',
    },
    rowValueMuted: {
      flexShrink: 1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
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
      borderTopColor: hexWithAlpha(c.onSurface, 0.12),
    },
    glyph: {
      width: UI_SIZE_20,
      height: UI_SIZE_20,
      borderRadius: UI_SIZE_9999,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    glyphOk: {
      backgroundColor: theme.colors.success,
    },
    glyphWarn: {
      backgroundColor: c.primary,
    },
    glyphBad: {
      backgroundColor: theme.colors.error,
    },
    verdictText: {
      flex: 1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      lineHeight: FontSize.body * 1.45,
    },
  })
  return styles
}, useSectionHooks)
