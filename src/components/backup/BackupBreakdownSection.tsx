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
  UI_ICON_SIZE_18,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'

type BreakdownBucket = {
  count: number
  size: number
}

type BackupBreakdownSectionProps = {
  buckets: {
    image: BreakdownBucket
    video: BreakdownBucket
    audio: BreakdownBucket
    file: BreakdownBucket
  } | null
  formatBytes: (bytes: number) => string
}

export function BackupBreakdownSection({ buckets, formatBytes }: BackupBreakdownSectionProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const { colors } = theme
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()

  if (!buckets) return null

  const hasItems =
    buckets.image.count > 0 ||
    buckets.video.count > 0 ||
    buckets.audio.count > 0 ||
    buckets.file.count > 0

  if (!hasItems) return null

  return (
    <MotionView
      entering={FadeInDown.duration(Durations.slide).delay(Durations.delayReset)}
      style={styles.breakdownSection}
    >
      <Text style={commonThemedStyles.settingsSectionCapSpaced}>{t('backup.breakdownByType')}</Text>
      <RNView style={commonThemedStyles.card}>
        {buckets.image.count > 0 && (
          <RNView style={styles.breakdownRow}>
            <RNView style={styles.breakdownRowMeta}>
              <SymbolIcon
                name="photo"
                size={UI_ICON_SIZE_18}
                color={colors.textMuted}
                weight="medium"
              />
              <Text style={styles.breakdownTitle}>{t('backup.images')}</Text>
              <Text style={styles.breakdownCount}>
                {t('backup.items', { count: buckets.image.count })}
              </Text>
            </RNView>
            <Text style={styles.breakdownSize}>{formatBytes(buckets.image.size)}</Text>
          </RNView>
        )}
        {buckets.video.count > 0 && (
          <RNView style={styles.breakdownRow}>
            <RNView style={styles.breakdownRowMeta}>
              <SymbolIcon
                name="video"
                size={UI_ICON_SIZE_18}
                color={colors.textMuted}
                weight="medium"
              />
              <Text style={styles.breakdownTitle}>{t('backup.videos')}</Text>
              <Text style={styles.breakdownCount}>
                {t('backup.items', { count: buckets.video.count })}
              </Text>
            </RNView>
            <Text style={styles.breakdownSize}>{formatBytes(buckets.video.size)}</Text>
          </RNView>
        )}
        {buckets.audio.count > 0 && (
          <RNView style={styles.breakdownRow}>
            <RNView style={styles.breakdownRowMeta}>
              <SymbolIcon
                name="mic"
                size={UI_ICON_SIZE_18}
                color={colors.textMuted}
                weight="medium"
              />
              <Text style={styles.breakdownTitle}>{t('backup.audio')}</Text>
              <Text style={styles.breakdownCount}>
                {t('backup.items', { count: buckets.audio.count })}
              </Text>
            </RNView>
            <Text style={styles.breakdownSize}>{formatBytes(buckets.audio.size)}</Text>
          </RNView>
        )}
        {buckets.file.count > 0 && (
          <RNView style={styles.breakdownRow}>
            <RNView style={styles.breakdownRowMeta}>
              <SymbolIcon
                name="doc.text"
                size={UI_ICON_SIZE_18}
                color={colors.textMuted}
                weight="medium"
              />
              <Text style={styles.breakdownTitle}>{t('backup.files')}</Text>
              <Text style={styles.breakdownCount}>
                {t('backup.items', { count: buckets.file.count })}
              </Text>
            </RNView>
            <Text style={styles.breakdownSize}>{formatBytes(buckets.file.size)}</Text>
          </RNView>
        )}
      </RNView>
    </MotionView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    breakdownSection: {
      marginTop: Space.lg,
      marginBottom: Space.sm,
    },
    breakdownRow: {
      ...commonStyles.rowBetween,
      paddingHorizontal: Space.lg,
      paddingVertical: Space.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.borderSecondary,
    },
    breakdownRowMeta: {
      ...commonStyles.row,
      gap: Space.md,
    },
    breakdownTitle: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.medium,
      color: theme.colors.text,
    },
    breakdownCount: {
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
    },
    breakdownSize: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
  })
  return styles
})
