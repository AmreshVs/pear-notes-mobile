import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import { FadeInDown } from 'react-native-reanimated'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { groupTransfersByNote } from '@pear-notes/core/utils.js'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import type { UploadItem } from '@/components/backup/UploadsSection'
import { MotionView } from '@/components/MotionView'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_18,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_28,
} from '@/constants/commonStyles'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  outlineVariant?: string
}

type AndroidUploadsSectionProps = {
  uploads: UploadItem[]
  noteTitles: Record<string, string>
  formatBytes: (bytes: number) => string
}

export function AndroidUploadsSection({
  uploads,
  noteTitles,
  formatBytes,
}: AndroidUploadsSectionProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors

  const renderUploadItem = (upload: UploadItem, index: number) => {
    const pct =
      upload.totalBytes > 0
        ? Math.min(100, Math.round((upload.uploadedBytes / upload.totalBytes) * 100))
        : 0
    return (
      <View key={upload.url} style={[styles.row, index > 0 && styles.rowBorder]}>
        <View style={styles.rowHeader}>
          <View style={styles.rowMeta}>
            <MaterialCommunityIcons
              name="cloud-upload-outline"
              size={UI_ICON_SIZE_18}
              color={c.primary}
            />
            <Text style={styles.fileName} numberOfLines={1}>
              {upload.fileName || t('storage.attachment')}
            </Text>
          </View>
          <Text style={styles.sizeLabel}>
            {formatBytes(upload.uploadedBytes)} / {formatBytes(upload.totalBytes)}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
      </View>
    )
  }

  const renderGroup = (group: { noteKey: string; title: string; items: UploadItem[] }) => (
    <View key={group.noteKey} style={styles.card}>
      <Text style={styles.groupTitle} numberOfLines={1}>
        {group.title || t('noteCard.untitled')}
      </Text>
      {group.items.map(renderUploadItem)}
    </View>
  )

  if (!uploads.length) return null

  const groups = groupTransfersByNote(uploads, noteTitles, t('noteCard.untitled'))

  return (
    <MotionView entering={FadeInDown.duration(240)} style={styles.section}>
      <Text style={styles.sectionTitle}>
        {t('storage.syncingToDevices')} ({uploads.length})
      </Text>
      <View style={styles.groupList}>{groups.map(renderGroup)}</View>
    </MotionView>
  )
}

const useUploadsHooks = () => {
  const md3 = useMD3Theme()
  return { md3 }
}

const useStyles = createThemedStylesheetWithHooks((_, { md3 }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    section: {
      marginBottom: UI_SIZE_24,
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
    groupList: {
      gap: UI_SIZE_12,
    },
    groupTitle: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurfaceVariant,
      paddingHorizontal: UI_SIZE_20,
      paddingTop: UI_SIZE_12,
    },
    card: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
    },
    row: {
      padding: Space.base,
      gap: UI_SIZE_8,
    },
    rowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.outlineVariant ?? c.onSurface,
    },
    rowHeader: {
      ...commonStyles.rowBetween,
      alignItems: 'center',
    },
    rowMeta: {
      ...commonStyles.row,
      alignItems: 'center',
      gap: UI_SIZE_8,
      flex: 1,
      marginRight: UI_SIZE_8,
    },
    fileName: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.medium,
      fontFamily: FontFamily.medium,
      color: c.onSurface,
      flexShrink: 1,
    },
    sizeLabel: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurfaceVariant,
    },
    progressTrack: {
      height: UI_SIZE_4,
      borderRadius: UI_SIZE_2,
      backgroundColor: c.outlineVariant ?? c.onSurface,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: UI_SIZE_2,
      backgroundColor: c.primary,
    },
  })
  return styles
}, useUploadsHooks)
