import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Switch, View as RNView } from 'react-native'

import { useMediaSyncPolicy } from '@/components/settings/useMediaSyncPolicy'
import { createThemedStylesheet, Text, useColors } from '@/components/Themed'
import { FontSize, FontWeight, Space } from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'

export function MediaSyncSection() {
  const { t } = useTranslation()
  const styles = useStyles()
  const colors = useColors()
  const commonThemedStyles = useCommonThemedStyles()
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
    () => ({ false: colors.controlBackground, true: colors.primary }),
    [colors.controlBackground, colors.primary],
  )

  return (
    <RNView style={styles.section}>
      <Text style={commonThemedStyles.sectionCamelCase}>{t('settings.mediaSync.title')}</Text>
      <RNView style={commonThemedStyles.card}>
        <RNView style={styles.toggleRow}>
          <RNView style={styles.toggleInfo}>
            <Text style={styles.rowTitle}>{t('settings.mediaSync.pauseMedia')}</Text>
            <Text style={styles.rowDesc}>{t('settings.mediaSync.pauseMediaDesc')}</Text>
          </RNView>
          <Switch
            value={mediaPaused}
            onValueChange={toggleMediaPaused}
            trackColor={trackColor}
            thumbColor={colors.white}
          />
        </RNView>

        <RNView style={styles.divider} />

        <RNView style={styles.toggleRow}>
          <RNView style={styles.toggleInfo}>
            <Text style={styles.rowTitle}>{t('settings.mediaSync.holdOnCellular')}</Text>
            <Text style={styles.rowDesc}>{connectionLabel}</Text>
          </RNView>
          <Switch
            value={holdOnCellular}
            onValueChange={toggleHoldOnCellular}
            trackColor={trackColor}
            thumbColor={colors.white}
          />
        </RNView>
      </RNView>
      {isHeld && <Text style={styles.heldNotice}>{t('settings.mediaSync.heldNotice')}</Text>}
    </RNView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    section: {
      marginTop: Space.lg,
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
      fontSize: FontSize.body,
      fontWeight: FontWeight.medium,
      color: theme.colors.text,
    },
    rowDesc: {
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginHorizontal: Space.base,
      backgroundColor: theme.colors.border,
    },
    heldNotice: {
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
      marginTop: Space.sm,
      marginHorizontal: Space.sm,
    },
  })
  return styles
})
