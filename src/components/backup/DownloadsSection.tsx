import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, View as RNView } from 'react-native'
import { FadeInDown } from 'react-native-reanimated'

import { groupTransfersByNote } from '@pear-notes/core/utils.js'

import { MotionView } from '@/components/MotionView'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  Durations,
  FontSize,
  FontWeight,
  Space,
  TRANSFER_LIST_MAX_HEIGHT,
  UI_ICON_SIZE_16,
  UI_SIZE_2,
  UI_SIZE_4,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { getDownloadStatusKey } from '@/utils/transferStatus'

export type DownloadItem = {
  noteKey: string
  url: string
  fileName: string
  totalBytes: number
  downloadedBytes: number
  status: string
  sourceOnline: boolean
  stalled: boolean
}

type DownloadsSectionProps = {
  downloads: DownloadItem[]
  noteTitles: Record<string, string>
  formatBytes: (bytes: number) => string
  onRetry: (url: string) => void
  onPause: (url: string) => void
}

export function DownloadsSection({
  downloads,
  noteTitles,
  formatBytes,
  onRetry,
  onPause,
}: DownloadsSectionProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const { colors } = theme
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()

  const renderDownloadItem = (download: DownloadItem, index: number) => {
    const pct =
      download.totalBytes > 0
        ? Math.min(100, Math.round((download.downloadedBytes / download.totalBytes) * 100))
        : 0
    const isStuck =
      download.status === 'error' || (download.status === 'downloading' && download.stalled)
    const statusKey = getDownloadStatusKey(download)
    return (
      <RNView key={download.url} style={[styles.row, index > 0 && styles.rowBorder]}>
        <RNView style={styles.rowHeader}>
          <RNView style={styles.rowMeta}>
            <SymbolIcon
              name="icloud.and.arrow.down"
              size={UI_ICON_SIZE_16}
              color={colors.primary}
              weight="medium"
            />
            <Text style={styles.fileName} numberOfLines={1}>
              {download.fileName || t('storage.attachment')}
            </Text>
            {!download.sourceOnline && (
              <SymbolIcon
                name="wifi.slash"
                size={UI_ICON_SIZE_16}
                color={colors.textMuted}
                weight="medium"
              />
            )}
          </RNView>
          <RNView style={styles.rowActions}>
            <Text style={styles.sizeLabel}>
              {formatBytes(download.downloadedBytes)} / {formatBytes(download.totalBytes)}
            </Text>
            {download.status === 'downloading' && !download.stalled && (
              <Pressable
                onPress={() => onPause(download.url)}
                hitSlop={8}
                style={({ pressed }) => [styles.retryBtn, pressed && commonStyles.pressed]}
              >
                <SymbolIcon
                  name="pause.fill"
                  size={UI_ICON_SIZE_16}
                  color={colors.primary}
                  weight="medium"
                />
              </Pressable>
            )}
            {download.status === 'paused' && (
              <Pressable
                onPress={() => onRetry(download.url)}
                hitSlop={8}
                style={({ pressed }) => [styles.retryBtn, pressed && commonStyles.pressed]}
              >
                <SymbolIcon
                  name="play.fill"
                  size={UI_ICON_SIZE_16}
                  color={colors.primary}
                  weight="medium"
                />
              </Pressable>
            )}
            {isStuck && (
              <Pressable
                onPress={() => onRetry(download.url)}
                hitSlop={8}
                style={({ pressed }) => [styles.retryBtn, pressed && commonStyles.pressed]}
              >
                <SymbolIcon
                  name="arrow.clockwise"
                  size={UI_ICON_SIZE_16}
                  color={colors.primary}
                  weight="medium"
                />
              </Pressable>
            )}
          </RNView>
        </RNView>
        <RNView style={styles.progressTrack}>
          <RNView style={[styles.progressFill, { width: `${pct}%` }]} />
        </RNView>
        {statusKey && <Text style={styles.statusCaption}>{t(statusKey)}</Text>}
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
    <MotionView entering={FadeInDown.duration(Durations.slide)} style={styles.section}>
      <Text style={commonThemedStyles.settingsSectionCap}>
        {t('storage.syncingFromDevices')} ({downloads.length})
      </Text>
      <ScrollView
        style={styles.groupScroll}
        contentContainerStyle={styles.groupList}
        nestedScrollEnabled
        showsVerticalScrollIndicator
      >
        {groups.map(renderGroup)}
      </ScrollView>
    </MotionView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    section: {
      marginBottom: Space.lg,
    },
    groupScroll: {
      maxHeight: TRANSFER_LIST_MAX_HEIGHT,
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
    statusCaption: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.medium,
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
