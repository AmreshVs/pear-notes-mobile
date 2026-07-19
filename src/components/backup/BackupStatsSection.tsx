import { HardDrive, Lock, RotateCcw } from 'lucide-react-native'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View as RNView } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  Durations,
  FontSize,
  FontWeight,
  Space,
  UI_SIZE_2,
  UI_STROKE_WIDTH_1_8,
  UI_ICON_SIZE_16,
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
  const styles = useStyles() as any
  const commonThemedStyles = useCommonThemedStyles()

  return (
    <>
      <Animated.View entering={FadeInDown.duration(Durations.slide).delay(Durations.delayMedium)}>
        <RNView style={commonThemedStyles.card}>
          <RNView style={styles.infoRow}>
            <RNView style={[commonThemedStyles.iconBox34, styles.goldIconBox]}>
              <RotateCcw
                size={UI_ICON_SIZE_16}
                color={colors.primary}
                strokeWidth={UI_STROKE_WIDTH_1_8}
              />
            </RNView>
            <RNView style={styles.infoText}>
              <Text style={styles.infoLabel}>{t('backup.lastBackup')}</Text>
              <Text style={styles.infoValue}>
                {lastBackupDate ? formatBackupDate(lastBackupDate) : t('backup.noBackup')}
              </Text>
            </RNView>
          </RNView>
        </RNView>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(Durations.slide).delay(Durations.delayLong)}
        style={styles.statsRow}
      >
        <RNView style={[commonThemedStyles.card, styles.statCard]}>
          <RNView style={[commonThemedStyles.iconBox34, styles.goldIconBox]}>
            <HardDrive
              size={UI_ICON_SIZE_16}
              color={colors.primary}
              strokeWidth={UI_STROKE_WIDTH_1_8}
            />
          </RNView>
          <Text style={styles.statLabel}>{t('backup.notesSize')}</Text>
          <Text style={styles.statValue}>{formatBytes(totalBlobBytes)}</Text>
        </RNView>
        <RNView style={[commonThemedStyles.card, styles.statCard]}>
          <RNView style={[commonThemedStyles.iconBox34, styles.goldIconBox]}>
            <Lock size={UI_ICON_SIZE_16} color={colors.primary} strokeWidth={UI_STROKE_WIDTH_1_8} />
          </RNView>
          <Text style={styles.statLabel}>{t('backup.encryption')}</Text>
          <Text style={styles.statValue}>{t('backup.encryptionValue')}</Text>
        </RNView>
      </Animated.View>
    </>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    goldIconBox: {
      backgroundColor: theme.colors.cardSelected,
    },
    infoRow: {
      ...commonStyles.row,
      padding: Space.base,
      gap: Space.md,
    },
    infoText: {
      flex: 1,
    },
    infoLabel: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
      marginBottom: UI_SIZE_2,
    },
    infoValue: {
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
    },
    statsRow: {
      ...commonStyles.row,
      gap: Space.md,
      marginTop: Space.md,
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
