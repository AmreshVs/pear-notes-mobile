import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Switch, Text, View } from 'react-native'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { useMediaSyncPolicy } from '@/components/settings/useMediaSyncPolicy'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import { FontFamily, FontSize, FontWeight, Space, UI_SIZE_28 } from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
}

export function MediaSyncSection() {
  const { t } = useTranslation()
  const styles = useStyles()
  const c = useMD3Theme().colors
  const {
    mediaPaused,
    holdOnCellular,
    connection,
    isMetered,
    isHeld,
    toggleMediaPaused,
    toggleHoldOnCellular,
  } = useMediaSyncPolicy()

  const connectionLabel =
    connection === 'cellular'
      ? isMetered
        ? t('settings.mediaSync.onCellular')
        : t('settings.mediaSync.onCellularAllowed')
      : connection === 'wifi'
        ? t('settings.mediaSync.onWifi')
        : connection === 'offline'
          ? t('settings.mediaSync.offline')
          : t('settings.mediaSync.connectionUnknown')

  const trackColor = useMemo(
    () => ({ false: hexWithAlpha(c.onSurface, 0.12), true: c.primary }),
    [c.onSurface, c.primary],
  )

  return (
    <View style={styles.section}>
      <Text style={styles.sectionCap}>{t('settings.mediaSync.title')}</Text>
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.rowTitle}>{t('settings.mediaSync.pauseMedia')}</Text>
            <Text style={styles.rowDesc}>{t('settings.mediaSync.pauseMediaDesc')}</Text>
          </View>
          <Switch value={mediaPaused} onValueChange={toggleMediaPaused} trackColor={trackColor} />
        </View>

        <View style={styles.divider} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.rowTitle}>{t('settings.mediaSync.holdOnCellular')}</Text>
            <Text style={styles.rowDesc}>{connectionLabel}</Text>
          </View>
          <Switch
            value={holdOnCellular}
            onValueChange={toggleHoldOnCellular}
            trackColor={trackColor}
          />
        </View>
      </View>
      {isHeld && <Text style={styles.heldNotice}>{t('settings.mediaSync.heldNotice')}</Text>}
    </View>
  )
}

const useStyles = createThemedStylesheetWithHooks((theme, md3) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    section: {
      marginTop: Space.lg,
    },
    sectionCap: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.semiBold,
      marginBottom: Space.md,
      marginLeft: Space.sm,
      textTransform: 'uppercase',
      color: c.onSurfaceVariant,
    },
    card: {
      borderRadius: UI_SIZE_28,
      overflow: 'hidden',
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Space.base,
      paddingHorizontal: Space.lg,
      paddingVertical: Space.base,
    },
    toggleInfo: {
      flex: 1,
      gap: Space.xs,
    },
    rowTitle: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.medium,
      color: c.onSurface,
    },
    rowDesc: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginLeft: Space.lg,
      backgroundColor: hexWithAlpha(c.onSurface, 0.12),
    },
    heldNotice: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      marginTop: Space.sm,
      marginHorizontal: Space.sm,
    },
  })
  return styles
}, useMD3Theme)
