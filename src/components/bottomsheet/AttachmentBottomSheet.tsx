import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Modal, Pressable, StyleSheet, View as RNView } from 'react-native'
import { Image } from 'expo-image'

import { formatBytes } from '@pear-notes/core/utils.js'

import type { AttachmentItem } from '@/components/attachments/attachments.types'
import { SymbolIcon } from '@/components/SymbolIcon'
import type { IconName } from '@/components/SymbolIcon.types'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_18,
  UI_ICON_SIZE_48,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { useAttachmentThumbnail } from '@/hooks/useAttachmentThumbnail'
import { attachmentDate, attachmentName } from '@/utils/attachmentFormat'

type Props = {
  item: AttachmentItem | null
  progress: number | null
  onClose: () => void
  onDismiss: () => void
  onPreview: (item: AttachmentItem) => void
  onOpenNote: (item: AttachmentItem) => void
  onShare: (item: AttachmentItem) => void
  onSave: (item: AttachmentItem) => void
}

const KIND_ICONS: Record<string, IconName> = {
  photo: 'photo',
  pdf: 'doc.richtext',
  audio: 'waveform',
  file: 'doc',
}

const PREVIEW_ASPECT_RATIO = 4 / 3

export function AttachmentBottomSheet({
  item,
  progress,
  onClose,
  onDismiss,
  onPreview,
  onOpenNote,
  onShare,
  onSave,
}: Props) {
  const { t, i18n } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const thumbnail = useAttachmentThumbnail(item)

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
    <Modal
      visible={!!item}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onDismiss={onDismiss}
    >
      <RNView style={commonThemedStyles.modalContainer}>
        <RNView style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {item ? attachmentName(item, t) : ''}
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={Space.sm}
            accessibilityRole="button"
            style={({ pressed }) => pressed && commonStyles.pressed}
          >
            <Text style={styles.doneLabel}>{t('common.done')}</Text>
          </Pressable>
        </RNView>
        <RNView style={styles.body}>
          <Pressable
            onPress={handlePreview}
            disabled={progress !== null}
            accessibilityRole="button"
            accessibilityLabel={t('attachmentsView.preview')}
            style={({ pressed }) => [styles.preview, pressed && commonStyles.pressed]}
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
              <SymbolIcon
                name={KIND_ICONS[item?.kind ?? 'file']}
                size={UI_ICON_SIZE_48}
                color={colors.textMuted}
              />
            )}
            {progress !== null && (
              <RNView style={styles.progress}>
                <ActivityIndicator color={colors.white} />
                <Text style={styles.progressText}>
                  {t('attachmentsView.downloading', { progress })}
                </Text>
              </RNView>
            )}
          </Pressable>
          <Text style={styles.meta}>{meta}</Text>
          <RNView style={styles.actions}>
            <Pressable
              onPress={handleOpenNote}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.action,
                styles.actionPrimary,
                pressed && commonStyles.pressed,
              ]}
            >
              <SymbolIcon name="doc.text" size={UI_ICON_SIZE_18} color={colors.onPrimary} />
              <Text style={styles.actionPrimaryText}>{t('attachmentsView.openNote')}</Text>
            </Pressable>
            <Pressable
              onPress={handleShare}
              accessibilityRole="button"
              style={({ pressed }) => [styles.action, pressed && commonStyles.pressed]}
            >
              <SymbolIcon name="square.and.arrow.up" size={UI_ICON_SIZE_18} color={colors.text} />
              <Text style={styles.actionText}>{t('attachmentsView.share')}</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              accessibilityRole="button"
              style={({ pressed }) => [styles.action, pressed && commonStyles.pressed]}
            >
              <SymbolIcon name="square.and.arrow.down" size={UI_ICON_SIZE_18} color={colors.text} />
              <Text style={styles.actionText}>{t('attachmentsView.save')}</Text>
            </Pressable>
          </RNView>
        </RNView>
      </RNView>
    </Modal>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    header: {
      ...commonStyles.rowBetween,
      gap: Space.md,
      paddingHorizontal: Space.lg,
      paddingTop: Space.lg,
      paddingBottom: Space.sm,
    },
    title: {
      ...commonStyles.flex1,
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
    },
    doneLabel: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      color: theme.colors.primary,
    },
    body: {
      paddingHorizontal: Space.lg,
      paddingTop: Space.sm,
      gap: Space.md,
    },
    preview: {
      ...commonStyles.centered,
      aspectRatio: PREVIEW_ASPECT_RATIO,
      borderRadius: Radii.md,
      borderCurve: 'continuous',
      overflow: 'hidden',
      backgroundColor: theme.colors.controlBackground,
    },
    previewImage: {
      ...StyleSheet.absoluteFill,
    },
    progress: {
      ...StyleSheet.absoluteFill,
      ...commonStyles.centered,
      gap: Space.sm,
      backgroundColor: theme.colors.scrim,
    },
    progressText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      color: theme.colors.white,
    },
    meta: {
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
    },
    actions: {
      ...commonStyles.row,
      flexWrap: 'wrap',
      gap: Space.sm,
    },
    action: {
      ...commonStyles.row,
      gap: Space.xs + 2,
      paddingHorizontal: Space.md,
      paddingVertical: Space.sm + 2,
      borderRadius: Radii.md,
      backgroundColor: theme.colors.controlBackground,
    },
    actionPrimary: {
      backgroundColor: theme.colors.primary,
    },
    actionText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    actionPrimaryText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      color: theme.colors.onPrimary,
    },
  })
  return styles
})
