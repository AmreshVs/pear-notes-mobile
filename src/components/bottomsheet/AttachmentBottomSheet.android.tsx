import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { BottomSheetModal, BottomSheetView } from '@expo/ui/community/bottom-sheet'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { Image } from 'expo-image'

import { formatBytes } from '@pear-notes/core/utils.js'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { useSheetStyles } from '@/components/android/useSheetStyles'
import type { AttachmentItem } from '@/components/attachments/attachments.types'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_18,
  UI_ICON_SIZE_48,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_28,
  UI_SIZE_44,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { useAttachmentThumbnail } from '@/hooks/useAttachmentThumbnail'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import { attachmentDate, attachmentName } from '@/utils/attachmentFormat'

type Props = {
  item: AttachmentItem | null
  progress: number | null
  onClose: () => void
  onPreview: (item: AttachmentItem) => void
  onOpenNote: (item: AttachmentItem) => void
  onShare: (item: AttachmentItem) => void
  onSave: (item: AttachmentItem) => void
}

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
}

const KIND_ICONS: Record<string, string> = {
  photo: 'image-outline',
  pdf: 'file-pdf-box',
  audio: 'waveform',
  file: 'file-outline',
}

const PREVIEW_ASPECT_RATIO = 4 / 3
const PROGRESS_SCRIM_ALPHA = 0.6

export function AttachmentBottomSheet({
  item,
  progress,
  onClose,
  onPreview,
  onOpenNote,
  onShare,
  onSave,
}: Props) {
  const { t, i18n } = useTranslation()
  const ref = useRef<BottomSheetModal>(null)
  const sheet = useSheetStyles()
  const styles = useStyles()
  const { colors } = useMD3Theme()
  const thumbnail = useAttachmentThumbnail(item)
  const ripple = useMemo(() => androidRipple(colors.onSurface), [colors.onSurface])
  const ripplePrimary = useMemo(() => androidRipple(colors.onPrimary), [colors.onPrimary])
  const visible = !!item

  useEffect(() => {
    if (visible) ref.current?.present()
    else ref.current?.dismiss()
  }, [visible])

  const handlePreview = useCallback(() => item && onPreview(item), [item, onPreview])
  const handleOpenNote = useCallback(() => item && onOpenNote(item), [item, onOpenNote])
  const handleShare = useCallback(() => item && onShare(item), [item, onShare])
  const handleSave = useCallback(() => item && onSave(item), [item, onSave])

  const meta = item
    ? t(item.size > 0 ? 'attachmentsView.inNote' : 'attachmentsView.inNoteNoSize', {
        size: formatBytes(item.size),
        title: item.title || t('noteCard.untitled'),
        date: attachmentDate(item, i18n.language),
      })
    : ''

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      enablePanDownToClose
      backgroundStyle={sheet.sheetBackground}
      handleIndicatorStyle={sheet.handleIndicator}
      onDismiss={onClose}
    >
      <BottomSheetView style={sheet.content}>
        <View style={sheet.header}>
          <Text style={sheet.title} numberOfLines={1}>
            {item ? attachmentName(item, t) : ''}
          </Text>
          <Text style={sheet.subtitle}>{meta}</Text>
        </View>
        <Pressable
          onPress={handlePreview}
          disabled={progress !== null}
          android_ripple={ripple}
          accessibilityRole="button"
          accessibilityLabel={t('attachmentsView.preview')}
          style={styles.preview}
        >
          {thumbnail ? (
            <Image
              source={thumbnail}
              style={styles.previewImage}
              contentFit="cover"
              contentPosition="top"
              cachePolicy="memory"
              transition={0}
            />
          ) : (
            <MaterialCommunityIcons
              name={(KIND_ICONS[item?.kind ?? 'file'] ?? KIND_ICONS.file) as never}
              size={UI_ICON_SIZE_48}
              color={colors.onSurfaceVariant}
            />
          )}
          {progress !== null && (
            <View style={styles.progress}>
              <ActivityIndicator color={colors.inverseOnSurface} />
              <Text style={styles.progressText}>
                {t('attachmentsView.downloading', { progress })}
              </Text>
            </View>
          )}
        </Pressable>
        <View style={styles.actions}>
          <Pressable
            onPress={handleOpenNote}
            android_ripple={ripplePrimary}
            accessibilityRole="button"
            style={[styles.action, styles.actionPrimary]}
          >
            <MaterialCommunityIcons
              name="file-document-outline"
              size={UI_ICON_SIZE_18}
              color={colors.onPrimary}
            />
            <Text style={styles.actionPrimaryText}>{t('attachmentsView.openNote')}</Text>
          </Pressable>
          <Pressable
            onPress={handleShare}
            android_ripple={ripple}
            accessibilityRole="button"
            style={styles.action}
          >
            <MaterialCommunityIcons
              name="share-variant-outline"
              size={UI_ICON_SIZE_18}
              color={colors.primary}
            />
            <Text style={styles.actionText}>{t('attachmentsView.share')}</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            android_ripple={ripple}
            accessibilityRole="button"
            style={styles.action}
          >
            <MaterialCommunityIcons
              name="download-outline"
              size={UI_ICON_SIZE_18}
              color={colors.primary}
            />
            <Text style={styles.actionText}>{t('attachmentsView.save')}</Text>
          </Pressable>
        </View>
        <View style={sheet.bottomPad} />
      </BottomSheetView>
    </BottomSheetModal>
  )
}

const useStyles = createThemedStylesheetWithHooks((_theme, md3) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    preview: {
      ...commonStyles.centered,
      aspectRatio: PREVIEW_ASPECT_RATIO,
      borderRadius: UI_SIZE_28,
      overflow: 'hidden',
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
    },
    previewImage: {
      ...StyleSheet.absoluteFill,
    },
    progress: {
      ...StyleSheet.absoluteFill,
      ...commonStyles.centered,
      gap: UI_SIZE_8,
      backgroundColor: hexWithAlpha(c.scrim, PROGRESS_SCRIM_ALPHA),
    },
    progressText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.inverseOnSurface,
    },
    actions: {
      ...commonStyles.row,
      flexWrap: 'wrap',
      gap: UI_SIZE_8,
      marginTop: UI_SIZE_16,
    },
    action: {
      ...commonStyles.row,
      ...commonStyles.centered,
      overflow: 'hidden',
      gap: UI_SIZE_8,
      minHeight: UI_SIZE_44,
      paddingHorizontal: UI_SIZE_20,
      paddingVertical: UI_SIZE_12,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.onSurface, 0.08),
    },
    actionPrimary: {
      backgroundColor: c.primary,
    },
    actionText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.primary,
    },
    actionPrimaryText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onPrimary,
    },
  })
  return styles
}, useMD3Theme)
