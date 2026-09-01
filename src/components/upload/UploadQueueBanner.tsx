import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, View as RNView } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { GlassView } from '@/components/GlassView'
import { createThemedStylesheet, Text, useColors } from '@/components/Themed'
import { useUploadQueueBanner } from '@/components/upload/useUploadQueueBanner'
import {
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  TRANSFER_LIST_MAX_HEIGHT,
  UI_ICON_SIZE_16,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_32,
} from '@/constants/commonStyles'
import type { NoteUploadItem } from '@/lib/uploadRegistry'

type UploadQueueBannerProps = {
  noteId: string | null
  bottom: number
}

export function UploadQueueBanner({ noteId, bottom }: UploadQueueBannerProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const colors = useColors()
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
    const isDone = item.status === 'done'
    const isCancelled = item.status === 'cancelled'
    if (isCancelled) return null
    return (
      <RNView key={item.id} style={styles.queueRow}>
        <SymbolView
          name={
            isDone
              ? 'checkmark.circle.fill'
              : item.status === 'uploading'
                ? 'arrow.up.circle'
                : 'circle'
          }
          size={UI_ICON_SIZE_16}
          tintColor={isDone ? colors.success : colors.textSecondary}
          fallback={<RNView />}
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
            style={({ pressed }) => [styles.rowCancel, pressed && styles.pressed]}
          >
            <SymbolView
              name="xmark"
              size={UI_ICON_SIZE_16}
              tintColor={colors.textSecondary}
              fallback={<RNView />}
            />
          </Pressable>
        )}
      </RNView>
    )
  }

  return (
    <RNView style={[styles.container, { bottom }]}>
      <GlassView intensity={12} borderRadius={Radii.card} style={styles.toast} isInteractive>
        <RNView style={styles.headerRow}>
          <Pressable
            onPress={canExpand ? toggleExpanded : undefined}
            disabled={!canExpand}
            accessibilityLabel={
              expanded ? t('noteEditor.upload.collapseQueue') : t('noteEditor.upload.expandQueue')
            }
            style={styles.headerPress}
          >
            <RNView style={styles.headerTextRow}>
              <Text style={styles.title}>{headerLabel}</Text>
              {canExpand && (
                <SymbolView
                  name={expanded ? 'chevron.up' : 'chevron.down'}
                  size={UI_ICON_SIZE_16}
                  tintColor={colors.textSecondary}
                  fallback={<RNView />}
                />
              )}
            </RNView>
          </Pressable>
          <Pressable
            onPress={cancelAll}
            hitSlop={8}
            accessibilityLabel={t('noteEditor.upload.cancelAll')}
            style={({ pressed }) => [styles.cancelAll, pressed && styles.pressed]}
          >
            <SymbolView
              name="xmark"
              size={UI_ICON_SIZE_16}
              tintColor={colors.text}
              weight="semibold"
              fallback={<RNView />}
            />
          </Pressable>
        </RNView>

        {!expanded && active && (
          <RNView style={styles.activeWrap}>
            <RNView style={styles.activeRow}>
              <Text style={styles.fileName} numberOfLines={1}>
                {active.fileName}
              </Text>
              <Text style={styles.percent}>{`${active.progress}%`}</Text>
            </RNView>
            <RNView style={styles.track}>
              <RNView style={[styles.fill, { width: `${active.progress}%` }]} />
            </RNView>
          </RNView>
        )}

        {expanded && (
          <ScrollView style={styles.queueScroll} nestedScrollEnabled>
            {queue.items.map(renderItem)}
          </ScrollView>
        )}
      </GlassView>
    </RNView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      left: Space.base,
      right: Space.base,
      zIndex: 20,
    },
    toast: {
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_12,
      gap: UI_SIZE_6,
      overflow: 'hidden',
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
      gap: UI_SIZE_6,
    },
    title: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.text,
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
      color: theme.colors.textSecondary,
    },
    percent: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.textSecondary,
    },
    track: {
      height: UI_SIZE_4,
      borderRadius: UI_SIZE_2,
      backgroundColor: theme.colors.borderSecondary,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: UI_SIZE_2,
      backgroundColor: theme.colors.primary,
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
      color: theme.colors.text,
    },
    queueStatus: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.textSecondary,
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
    pressed: {
      opacity: 0.5,
    },
  })
  return styles
})
