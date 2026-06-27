import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import { commonStyles, FontFamily, FontSize, FontWeight, UI_ICON_SIZE_22, UI_SIZE_12, UI_SIZE_14, UI_SIZE_16, UI_SIZE_28, UI_SIZE_4, UI_SIZE_8, UI_SIZE_9999 } from '@/constants/commonStyles'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  surfaceContainerHighest?: string
  outlineVariant?: string
  primaryContainer?: string
  onSurfaceVariant?: string
}

type AndroidBackupStatsSectionProps = {
  lastBackupDate: string | null
  totalBlobBytes: number
  formatBackupDate: (iso: string) => string
  formatBytes: (bytes: number) => string
}

const ICON_WRAP_SIZE = 44

export function AndroidBackupStatsSection({
  lastBackupDate,
  totalBlobBytes,
  formatBackupDate,
  formatBytes,
}: AndroidBackupStatsSectionProps) {
  const { t } = useTranslation()
  const styles = useStyles() as any
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors

  return (
    <>
      <Animated.View entering={FadeInDown.duration(240).delay(100)} style={styles.infoCard}>
        <View style={styles.infoIconWrap}>
          <MaterialCommunityIcons name="history" size={UI_ICON_SIZE_22} color={c.primary} />
        </View>
        <View style={styles.infoText}>
          <Text style={styles.infoLabel}>{t('backup.lastBackup')}</Text>
          <Text style={styles.infoValue}>
            {lastBackupDate ? formatBackupDate(lastBackupDate) : t('backup.noBackup')}
          </Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(240).delay(130)} style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statIconWrap}>
            <MaterialCommunityIcons name="database-outline" size={UI_ICON_SIZE_22} color={c.primary} />
          </View>
          <Text style={styles.statLabel}>{t('backup.notesSize')}</Text>
          <Text style={styles.statValue}>{formatBytes(totalBlobBytes)}</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconWrap}>
            <MaterialCommunityIcons name="lock-outline" size={UI_ICON_SIZE_22} color={c.primary} />
          </View>
          <Text style={styles.statLabel}>{t('backup.encryption')}</Text>
          <Text style={styles.statValue}>{t('backup.encryptionValue')}</Text>
        </View>
      </Animated.View>
    </>
  )
}

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
  return hex.length === 7 ? `${hex}${a}` : hex
}

const useStatsHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3, insets }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    infoCard: {
      ...commonStyles.row,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      padding: UI_SIZE_16,
      marginBottom: UI_SIZE_12,
      gap: UI_SIZE_14,
    },
    infoIconWrap: {
      width: ICON_WRAP_SIZE,
      height: ICON_WRAP_SIZE,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
      ...commonStyles.centered,
    },
    infoText: {
      flex: 1,
    },
    infoLabel: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
      marginBottom: UI_SIZE_4,
    },
    infoValue: {
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
      fontFamily: FontFamily.regular,
    },
    statsRow: {
      ...commonStyles.row,
      gap: UI_SIZE_12,
    },
    statCard: {
      flex: 1,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      padding: UI_SIZE_16,
      alignItems: 'flex-start',
    },
    statIconWrap: {
      width: ICON_WRAP_SIZE,
      height: ICON_WRAP_SIZE,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
      ...commonStyles.centered,
      marginBottom: UI_SIZE_8,
    },
    statLabel: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
      marginBottom: UI_SIZE_4,
    },
    statValue: {
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
      fontFamily: FontFamily.regular,
    },
  })
  return styles
}, useStatsHooks)
