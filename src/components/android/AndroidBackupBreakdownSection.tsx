import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import { commonStyles, FontFamily, FontSize, FontWeight, UI_ICON_SIZE_20, UI_SIZE_12, UI_SIZE_20, UI_SIZE_24, UI_SIZE_28, UI_SIZE_8 } from '@/constants/commonStyles'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  surfaceContainerHighest?: string
  outlineVariant?: string
  primaryContainer?: string
  onSurfaceVariant?: string
}

type BreakdownBucket = {
  count: number
  size: number
}

type AndroidBackupBreakdownSectionProps = {
  buckets: {
    image: BreakdownBucket
    video: BreakdownBucket
    audio: BreakdownBucket
    file: BreakdownBucket
  } | null
  formatBytes: (bytes: number) => string
}

export function AndroidBackupBreakdownSection({
  buckets,
  formatBytes,
}: AndroidBackupBreakdownSectionProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors

  if (!buckets) return null

  const hasItems =
    buckets.image.count > 0 ||
    buckets.video.count > 0 ||
    buckets.audio.count > 0 ||
    buckets.file.count > 0

  if (!hasItems) return null

  return (
    <Animated.View entering={FadeInDown.duration(240).delay(160)} style={styles.breakdownSection}>
      <Text style={styles.sectionTitle}>{t('backup.breakdownByType')}</Text>
      <View style={styles.breakdownCard}>
        {buckets.image.count > 0 && (
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownRowMeta}>
              <MaterialCommunityIcons name="image-outline" size={UI_ICON_SIZE_20} color={c.onSurfaceVariant} />
              <Text style={styles.breakdownTitle}>{t('backup.images')}</Text>
              <Text style={styles.breakdownCount}>
                {t('backup.items', { count: buckets.image.count })}
              </Text>
            </View>
            <Text style={styles.breakdownSize}>{formatBytes(buckets.image.size)}</Text>
          </View>
        )}
        {buckets.video.count > 0 && (
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownRowMeta}>
              <MaterialCommunityIcons name="video-outline" size={UI_ICON_SIZE_20} color={c.onSurfaceVariant} />
              <Text style={styles.breakdownTitle}>{t('backup.videos')}</Text>
              <Text style={styles.breakdownCount}>
                {t('backup.items', { count: buckets.video.count })}
              </Text>
            </View>
            <Text style={styles.breakdownSize}>{formatBytes(buckets.video.size)}</Text>
          </View>
        )}
        {buckets.audio.count > 0 && (
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownRowMeta}>
              <MaterialCommunityIcons
                name="microphone-outline"
                size={UI_ICON_SIZE_20}
                color={c.onSurfaceVariant}
              />
              <Text style={styles.breakdownTitle}>{t('backup.audio')}</Text>
              <Text style={styles.breakdownCount}>
                {t('backup.items', { count: buckets.audio.count })}
              </Text>
            </View>
            <Text style={styles.breakdownSize}>{formatBytes(buckets.audio.size)}</Text>
          </View>
        )}
        {buckets.file.count > 0 && (
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownRowMeta}>
              <MaterialCommunityIcons
                name="file-document-outline"
                size={UI_ICON_SIZE_20}
                color={c.onSurfaceVariant}
              />
              <Text style={styles.breakdownTitle}>{t('backup.files')}</Text>
              <Text style={styles.breakdownCount}>
                {t('backup.items', { count: buckets.file.count })}
              </Text>
            </View>
            <Text style={styles.breakdownSize}>{formatBytes(buckets.file.size)}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  )
}

const useBreakdownHooks = () => {
  const md3 = useMD3Theme()
  return { md3 }
}

const useStyles = createThemedStylesheetWithHooks((_, { md3 }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    breakdownSection: {
      marginTop: UI_SIZE_24,
      marginBottom: UI_SIZE_8,
    },
    sectionTitle: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurfaceVariant,
      marginBottom: UI_SIZE_8,
      marginLeft: UI_SIZE_8,
      letterSpacing: 0.5,
    },
    breakdownCard: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      paddingVertical: UI_SIZE_8,
    },
    breakdownRow: {
      ...commonStyles.rowBetween,
      paddingHorizontal: UI_SIZE_20,
      paddingVertical: UI_SIZE_12,
    },
    breakdownRowMeta: {
      ...commonStyles.row,
      gap: UI_SIZE_12,
    },
    breakdownTitle: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.medium,
      fontFamily: FontFamily.medium,
      color: c.onSurface,
    },
    breakdownCount: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    breakdownSize: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
    },
  })
  return styles
}, useBreakdownHooks)
