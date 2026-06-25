import { FileText, Film, Image as ImageIcon, Mic } from 'lucide-react-native'
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
  LetterSpacing,
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
  const styles = useStyles() as any
  const commonThemedStyles = useCommonThemedStyles()

  if (!buckets) return null

  const hasItems =
    buckets.image.count > 0 ||
    buckets.video.count > 0 ||
    buckets.audio.count > 0 ||
    buckets.file.count > 0

  if (!hasItems) return null

  return (
    <Animated.View
      entering={FadeInDown.duration(Durations.slide).delay(Durations.delayReset)}
      style={styles.breakdownSection}
    >
      <Text style={styles.sectionCapMargin}>{t('backup.breakdownByType')}</Text>
      <RNView style={commonThemedStyles.card}>
        {buckets.image.count > 0 && (
          <RNView style={styles.breakdownRow}>
            <RNView style={styles.breakdownRowMeta}>
              <ImageIcon size={UI_ICON_SIZE_18} color={colors.textMuted} strokeWidth={2} />
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
              <Film size={UI_ICON_SIZE_18} color={colors.textMuted} strokeWidth={2} />
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
              <Mic size={UI_ICON_SIZE_18} color={colors.textMuted} strokeWidth={2} />
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
              <FileText size={UI_ICON_SIZE_18} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.breakdownTitle}>{t('backup.files')}</Text>
              <Text style={styles.breakdownCount}>
                {t('backup.items', { count: buckets.file.count })}
              </Text>
            </RNView>
            <Text style={styles.breakdownSize}>{formatBytes(buckets.file.size)}</Text>
          </RNView>
        )}
      </RNView>
    </Animated.View>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    breakdownSection: {
      marginTop: Space.xl,
      marginBottom: Space.sm,
    },
    sectionCapMargin: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      letterSpacing: LetterSpacing.caps,
      marginBottom: Space.md,
      marginTop: Space.xxxl,
      textTransform: 'uppercase',
      color: theme.colors.textMuted,
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
