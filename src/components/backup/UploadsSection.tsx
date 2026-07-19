import { CloudUpload } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { View as RNView, ScrollView, StyleSheet } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  Durations,
  FontSize,
  FontWeight,
  LetterSpacing,
  Space,
  TRANSFER_LIST_MAX_HEIGHT,
  UI_ICON_SIZE_16,
  UI_SIZE_2,
  UI_SIZE_4,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { groupTransfersByNote } from '@/lib/backupUtils'

export type UploadItem = {
  noteKey: string
  url: string
  fileName: string
  totalBytes: number
  uploadedBytes: number
  status: string
}

type UploadsSectionProps = {
  uploads: UploadItem[]
  noteTitles: Record<string, string>
  formatBytes: (bytes: number) => string
}

export function UploadsSection({ uploads, noteTitles, formatBytes }: UploadsSectionProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const { colors } = theme
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()

  const renderUploadItem = (upload: UploadItem, index: number) => {
    const pct =
      upload.totalBytes > 0
        ? Math.min(100, Math.round((upload.uploadedBytes / upload.totalBytes) * 100))
        : 0
    return (
      <RNView key={upload.url} style={[styles.row, index > 0 && styles.rowBorder]}>
        <RNView style={styles.rowHeader}>
          <RNView style={styles.rowMeta}>
            <CloudUpload size={UI_ICON_SIZE_16} color={colors.primary} strokeWidth={2} />
            <Text style={styles.fileName} numberOfLines={1}>
              {upload.fileName || t('storage.attachment')}
            </Text>
          </RNView>
          <Text style={styles.sizeLabel}>
            {formatBytes(upload.uploadedBytes)} / {formatBytes(upload.totalBytes)}
          </Text>
        </RNView>
        <RNView style={styles.progressTrack}>
          <RNView style={[styles.progressFill, { width: `${pct}%` }]} />
        </RNView>
      </RNView>
    )
  }

  const renderGroup = (group: { noteKey: string; title: string; items: UploadItem[] }) => (
    <RNView key={group.noteKey} style={commonThemedStyles.card}>
      <Text style={styles.groupTitle} numberOfLines={1}>
        {group.title || t('noteCard.untitled')}
      </Text>
      {group.items.map(renderUploadItem)}
    </RNView>
  )

  if (!uploads.length) return null

  const groups = groupTransfersByNote(uploads, noteTitles, t('noteCard.untitled'))

  return (
    <Animated.View entering={FadeInDown.duration(Durations.slide)} style={styles.section}>
      <Text style={styles.sectionCap}>
        {t('storage.syncingToDevices')} ({uploads.length})
      </Text>
      <ScrollView
        style={styles.groupScroll}
        contentContainerStyle={styles.groupList}
        nestedScrollEnabled
        showsVerticalScrollIndicator
      >
        {groups.map(renderGroup)}
      </ScrollView>
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
