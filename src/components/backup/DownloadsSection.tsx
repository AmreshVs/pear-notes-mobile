import { CloudDownload, RotateCw, WifiOff } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { Pressable, View as RNView, StyleSheet } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  Durations,
  FontSize,
  FontWeight,
  LetterSpacing,
  Space,
  UI_ICON_SIZE_16,
  UI_SIZE_2,
  UI_SIZE_4,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { groupTransfersByNote } from '@/lib/backupUtils'

export type DownloadItem = {
  noteKey: string
  url: string
  fileName: string
  totalBytes: number
  downloadedBytes: number
  status: string
  sourceOnline: boolean
}

type DownloadsSectionProps = {
  downloads: DownloadItem[]
  noteTitles: Record<string, string>
  formatBytes: (bytes: number) => string
  onRetry: (url: string) => void
}

export function DownloadsSection({
  downloads,
  noteTitles,
  formatBytes,
  onRetry,
}: DownloadsSectionProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const { colors } = theme
  const styles = useStyles() as any
  const commonThemedStyles = useCommonThemedStyles()

  const renderDownloadItem = (download: DownloadItem, index: number) => {
    const pct =
      download.totalBytes > 0
        ? Math.min(100, Math.round((download.downloadedBytes / download.totalBytes) * 100))
        : 0
    return (
      <RNView key={download.url} style={[styles.row, index > 0 && styles.rowBorder]}>
        <RNView style={styles.rowHeader}>
          <RNView style={styles.rowMeta}>
            <CloudDownload size={UI_ICON_SIZE_16} color={colors.primary} strokeWidth={2} />
            <Text style={styles.fileName} numberOfLines={1}>
              {download.fileName || t('storage.attachment')}
            </Text>
            {!download.sourceOnline && (
              <WifiOff size={UI_ICON_SIZE_16} color={colors.textMuted} strokeWidth={2} />
            )}
          </RNView>
          <RNView style={styles.rowActions}>
            <Text style={styles.sizeLabel}>
              {formatBytes(download.downloadedBytes)} / {formatBytes(download.totalBytes)}
            </Text>
            {download.status === 'error' && (
              <Pressable
                onPress={() => onRetry(download.url)}
                hitSlop={8}
                style={({ pressed }) => [styles.retryBtn, pressed && commonStyles.pressed]}
              >
                <RotateCw size={UI_ICON_SIZE_16} color={colors.primary} strokeWidth={2} />
              </Pressable>
            )}
          </RNView>
        </RNView>
        <RNView style={styles.progressTrack}>
          <RNView style={[styles.progressFill, { width: `${pct}%` }]} />
        </RNView>
      </RNView>
    )
  }

  const renderGroup = (group: { noteKey: string; title: string; items: DownloadItem[] }) => (
    <RNView key={group.noteKey} style={commonThemedStyles.card}>
      <Text style={styles.groupTitle} numberOfLines={1}>
        {group.title || t('noteCard.untitled')}
      </Text>
      {group.items.map(renderDownloadItem)}
    </RNView>
  )

  if (!downloads.length) return null

  const groups = groupTransfersByNote(downloads, noteTitles, t('noteCard.untitled'))

  return (
    <Animated.View entering={FadeInDown.duration(Durations.slide)} style={styles.section}>
      <Text style={styles.sectionCap}>
        {t('storage.syncingFromDevices')} ({downloads.length})
      </Text>
      <RNView style={styles.groupList}>{groups.map(renderGroup)}</RNView>
    </Animated.View>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    section: {
      marginBottom: Space.lg,
    },
    sectionCap: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      letterSpacing: LetterSpacing.caps,
      marginBottom: Space.md,
      textTransform: 'uppercase',
      color: theme.colors.textMuted,
    },
    groupList: {
      gap: Space.md,
    },
    groupTitle: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      color: theme.colors.textMuted,
      paddingHorizontal: Space.lg,
      paddingTop: Space.md,
    },
    row: {
      paddingHorizontal: Space.lg,
      paddingVertical: Space.md,
      gap: Space.sm,
    },
    rowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.borderSecondary,
    },
    rowHeader: {
      ...commonStyles.rowBetween,
      alignItems: 'center',
    },
    rowMeta: {
      ...commonStyles.row,
      alignItems: 'center',
      gap: Space.sm,
      flex: 1,
      marginRight: Space.sm,
    },
    rowActions: {
      ...commonStyles.row,
      alignItems: 'center',
      gap: Space.sm,
    },
    fileName: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.medium,
      color: theme.colors.text,
      flexShrink: 1,
    },
    sizeLabel: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      color: theme.colors.textMuted,
    },
    retryBtn: {
      padding: Space.xs,
    },
    progressTrack: {
      height: UI_SIZE_4,
      borderRadius: UI_SIZE_2,
      backgroundColor: theme.colors.borderSecondary,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: UI_SIZE_2,
      backgroundColor: theme.colors.primary,
    },
  })
  return styles
})
