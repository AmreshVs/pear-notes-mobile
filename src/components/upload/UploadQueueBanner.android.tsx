import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import { useUploadQueueBanner } from '@/components/upload/useUploadQueueBanner'
import {
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  TRANSFER_LIST_MAX_HEIGHT,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_20,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_28,
  UI_SIZE_32,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'
import type { NoteUploadItem } from '@/lib/uploadRegistry'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
}

type UploadQueueBannerProps = {
  noteId: string | null
  bottom: number
}

export function UploadQueueBanner({ noteId, bottom }: UploadQueueBannerProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const c = useMD3Theme().colors
  const {
    queue,
    hasQueue,
    isBatch,
    expanded,
    canExpand,
    currentIndex,
    toggleExpanded,
    cancelItem,
    cancelAll,
  } = useUploadQueueBanner(noteId)

  if (!hasQueue) return null

  const active = queue.activeItem
  const headerLabel = isBatch
    ? t('noteEditor.upload.uploadingCount', { current: currentIndex, total: queue.totalCount })
    : t('noteEditor.upload.uploading')

  const renderItem = (item: NoteUploadItem) => {
    if (item.status === 'cancelled') return null
    const isDone = item.status === 'done'
    return (
      <View key={item.id} style={styles.queueRow}>
        <MaterialCommunityIcons
          name={isDone ? 'check-circle' : item.status === 'uploading' ? 'upload' : 'clock-outline'}
          size={UI_ICON_SIZE_16}
          color={isDone ? c.primary : c.onSurfaceVariant}
        />
        <Text style={styles.queueName} numberOfLines={1}>
          {item.fileName}
        </Text>
        <Text style={styles.queueStatus}>
          {isDone
            ? t('noteEditor.upload.done')
            : item.status === 'uploading'
              ? `${item.progress}%`
              : t('noteEditor.upload.queued')}
        </Text>
        {!isDone && (
          <Pressable
            onPress={() => cancelItem(item.id)}
            hitSlop={8}
            accessibilityLabel={t('noteEditor.upload.cancelItem')}
            style={styles.rowCancel}
          >
            <MaterialCommunityIcons
              name="close"
              size={UI_ICON_SIZE_16}
              color={c.onSurfaceVariant}
            />
          </Pressable>
        )}
      </View>
    )
  }

  return (
    <View style={[styles.container, { bottom }]}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={canExpand ? toggleExpanded : undefined}
          disabled={!canExpand}
          accessibilityLabel={
            expanded ? t('noteEditor.upload.collapseQueue') : t('noteEditor.upload.expandQueue')
          }
          style={styles.headerPress}
        >
          <View style={styles.headerTextRow}>
            <Text style={styles.title}>{headerLabel}</Text>
            {canExpand && (
              <MaterialCommunityIcons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={UI_ICON_SIZE_20}
                color={c.onSurfaceVariant}
              />
            )}
          </View>
        </Pressable>
        <Pressable
          onPress={cancelAll}
          hitSlop={8}
          accessibilityLabel={t('noteEditor.upload.cancelAll')}
          style={styles.cancelAll}
        >
          <MaterialCommunityIcons name="close" size={UI_ICON_SIZE_20} color={c.onSurface} />
        </Pressable>
      </View>

      {!expanded && active && (
        <View style={styles.activeWrap}>
          <View style={styles.activeRow}>
            <Text style={styles.fileName} numberOfLines={1}>
              {active.fileName}
            </Text>
            <Text style={styles.percent}>{`${active.progress}%`}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${active.progress}%` }]} />
          </View>
        </View>
      )}

      {expanded && (
        <ScrollView style={styles.queueScroll} nestedScrollEnabled>
          {queue.items.map(renderItem)}
        </ScrollView>
      )}
    </View>
  )
}

const useStyles = createThemedStylesheetWithHooks((theme, md3) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      left: Space.base,
      right: Space.base,
      zIndex: 20,
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_12,
      borderRadius: UI_SIZE_28,
      gap: UI_SIZE_6,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      elevation: 6,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_12,
    },
    headerPress: {
      flex: 1,
    },
    headerTextRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_4,
    },
    title: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
    },
    activeWrap: {
      gap: UI_SIZE_6,
    },
    activeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: UI_SIZE_12,
    },
    fileName: {
      flex: 1,
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    percent: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      color: c.onSurfaceVariant,
    },
    track: {
      height: UI_SIZE_4,
      borderRadius: UI_SIZE_2,
      overflow: 'hidden',
      backgroundColor: hexWithAlpha(c.onSurface, 0.12),
    },
    fill: {
      height: '100%',
      borderRadius: UI_SIZE_2,
      backgroundColor: c.primary,
    },
    queueScroll: {
      maxHeight: TRANSFER_LIST_MAX_HEIGHT,
    },
    queueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_6,
      paddingVertical: UI_SIZE_6,
    },
    queueName: {
      flex: 1,
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurface,
    },
    queueStatus: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      color: c.onSurfaceVariant,
    },
    rowCancel: {
      width: UI_SIZE_32,
      alignItems: 'flex-end',
    },
    cancelAll: {
      width: UI_SIZE_32,
      height: UI_SIZE_32,
      alignItems: 'center',
      justifyContent: 'center',
    },
  })
  return styles
}, useMD3Theme)
