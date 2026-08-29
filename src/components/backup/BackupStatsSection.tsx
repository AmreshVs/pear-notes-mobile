import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View as RNView } from 'react-native'
import { FadeInDown } from 'react-native-reanimated'

import { MotionView } from '@/components/MotionView'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  Durations,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_16,
  UI_SIZE_2,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'

type BackupStatsSectionProps = {
  lastBackupDate: string | null
  totalBlobBytes: number
  formatBackupDate: (iso: string) => string
  formatBytes: (bytes: number) => string
}

export function BackupStatsSection({
  lastBackupDate,
  totalBlobBytes,
  formatBackupDate,
  formatBytes,
}: BackupStatsSectionProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const { colors } = theme
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()

  return (
    <MotionView
      entering={FadeInDown.duration(Durations.slide).delay(Durations.delayMedium)}
      style={styles.statsRow}
    >
      <RNView style={[commonThemedStyles.card, styles.statCard]}>
        <RNView style={[commonThemedStyles.iconBox34, styles.goldIconBox]}>
          <SymbolIcon name="arrow.counterclockwise" size={UI_ICON_SIZE_16} color={colors.primary} />
        </RNView>
        <Text style={styles.statLabel}>{t('backup.lastBackup')}</Text>
        <Text style={styles.statValue}>
          {lastBackupDate ? formatBackupDate(lastBackupDate) : t('backup.noBackup')}
        </Text>
      </RNView>
      <RNView style={[commonThemedStyles.card, styles.statCard]}>
        <RNView style={[commonThemedStyles.iconBox34, styles.goldIconBox]}>
          <SymbolIcon name="internaldrive" size={UI_ICON_SIZE_16} color={colors.primary} />
        </RNView>
        <Text style={styles.statLabel}>{t('backup.notesSize')}</Text>
        <Text style={styles.statValue}>{formatBytes(totalBlobBytes)}</Text>
      </RNView>
    </MotionView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    goldIconBox: {
      backgroundColor: theme.colors.cardSelected,
    },
    statsRow: {
      ...commonStyles.row,
      gap: Space.md,
    },
    statCard: {
      flex: 1,
      padding: Space.base,
      alignItems: 'flex-start',
    },
    statLabel: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
      marginTop: Space.sm,
      marginBottom: UI_SIZE_2,
    },
    statValue: {
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
    },
  })
  return styles
})
