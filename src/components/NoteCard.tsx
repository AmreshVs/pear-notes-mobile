import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View as RNView,
  type ViewStyle,
} from 'react-native'
import { FadeIn } from 'react-native-reanimated'
import { useSelector } from 'react-redux'
import { Image } from 'expo-image'

import { getHyperdriveServerAddress } from '@pear-notes/core/store/slices/uiSlice.js'

import { MotionView } from '@/components/MotionView'
import { type IconName, SymbolIcon } from '@/components/SymbolIcon'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  LetterSpacing,
  ListMotion,
  Radii,
  Space,
  UI_ICON_SIZE_14,
  UI_ICON_SIZE_22,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_8,
  UI_SIZE_22,
  UI_SIZE_56,
} from '@/constants/commonStyles'
import { FALLBACK_FOLDER_SF, FOLDER_ICON_SF } from '@/constants/folderIcons'
import { NOTE_ACTION } from '@/constants/noteActions'
import { useAndroidColorTheme } from '@/hooks/useAndroidColorTheme'
import { useIsNoteUnlocked } from '@/lib/noteLock'
import { useNoteUploadQueue } from '@/lib/uploadRegistry'
import { useCachedImageThumbnail } from '@/lib/useCachedImageThumbnail'
import { useCachedPdfThumbnail } from '@/lib/useCachedPdfThumbnail'
import {
  isAccessibilityTextSize,
  MAX_FONT_SCALE_CHROME,
  scaledLineCount,
} from '@/utils/dynamicType'
import { resolveHyperdriveUrl } from '@/utils/hyperdriveUrl'
import { buildNoteCardMenu } from '@/utils/noteCardMenu'
import type { AttachmentInfo, PdfAttachmentRef } from '@/utils/noteUtils'

import { ContextMenuView } from '../../modules/expo-context-menu'

import { createThemedStylesheet, Text, useFontScale, useTheme } from './Themed'

const PREVIEW_SCALE = 0.92

const ATTACHMENT_ICONS: Record<string, IconName> = {
  image: 'photo',
  video: 'video',
  audio: 'mic',
  file: 'paperclip',
  mixed: 'paperclip',
}

interface MoveFolder {
  id: string
  name: string
}

interface NoteCardProps {
  id: string
  title: string
  date: string
  summary: string
  attachment?: AttachmentInfo | null
  rawImageUrl?: string | null
  pdfAttachment?: PdfAttachmentRef | null
  folderName?: string
  folderIconToken?: string
  selected?: boolean
  selecting?: boolean
  checked?: boolean
  isFirst?: boolean
  isLast?: boolean
  grouped?: boolean
  animationIndex?: number
  locked?: boolean
  pinned?: boolean
  onPress: (id: string) => void
  onDelete?: (id: string) => void
  onRestore?: (id: string) => void
  onToggleLock?: (id: string, currentlyLocked: boolean) => void
  onTogglePin?: (id: string, currentlyPinned: boolean) => void
  moveFolders?: MoveFolder[]
  onMoveTo?: (id: string, folderId: string) => void
  onToggleSelect?: (id: string) => void
}

function areNoteCardPropsEqual(prev: NoteCardProps, next: NoteCardProps) {
  return (
    prev.id === next.id &&
    prev.title === next.title &&
    prev.date === next.date &&
    prev.summary === next.summary &&
    prev.attachment === next.attachment &&
    prev.rawImageUrl === next.rawImageUrl &&
    prev.pdfAttachment === next.pdfAttachment &&
    prev.folderName === next.folderName &&
    prev.folderIconToken === next.folderIconToken &&
    prev.selected === next.selected &&
    prev.selecting === next.selecting &&
    prev.checked === next.checked &&
    prev.isFirst === next.isFirst &&
    prev.isLast === next.isLast &&
    prev.grouped === next.grouped &&
    prev.locked === next.locked &&
    prev.pinned === next.pinned &&
    prev.moveFolders === next.moveFolders &&
    prev.onPress === next.onPress &&
    prev.onDelete === next.onDelete &&
    prev.onRestore === next.onRestore &&
    prev.onToggleLock === next.onToggleLock &&
    prev.onTogglePin === next.onTogglePin &&
    prev.onMoveTo === next.onMoveTo &&
    prev.onToggleSelect === next.onToggleSelect
  )
}

export const NoteCard = memo(function NoteCard({
  id,
  title,
  date,
  summary,
  attachment,
  rawImageUrl,
  pdfAttachment,
  folderName,
  folderIconToken,
  selected,
  selecting,
  checked,
  isFirst,
  isLast,
  grouped,
  locked,
  pinned,
  animationIndex = 0,
  onPress,
  onDelete,
  onRestore,
  onToggleLock,
  onTogglePin,
  moveFolders,
  onMoveTo,
  onToggleSelect,
}: NoteCardProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const { colors } = useTheme()
  const lockIconColor = colors.primary
  const [thumbError, setThumbError] = useState(false)
  const isUnlocked = useIsNoteUnlocked(id)
  const uploadQueue = useNoteUploadQueue(id)
  const upload = uploadQueue.activeItem
  const masked = locked === true && !isUnlocked

  const hyperdriveServerAddress = useSelector(getHyperdriveServerAddress)
  const imageUrl = useMemo(
    () => resolveHyperdriveUrl(rawImageUrl, hyperdriveServerAddress),
    [rawImageUrl, hyperdriveServerAddress],
  )
  const isPearTheme = useAndroidColorTheme() === 'pear'

  useEffect(() => {
    setThumbError(false)
  }, [imageUrl])

  const handlePress = useCallback(() => {
    if (selecting) {
      onToggleSelect?.(id)
      return
    }
    onPress(id)
  }, [selecting, onToggleSelect, onPress, id])
  const handleThumbError = useCallback(() => setThumbError(true), [])
  const handleDelete = useCallback(() => onDelete?.(id), [onDelete, id])
  const handleRestore = useCallback(() => onRestore?.(id), [onRestore, id])
  const handleToggleLock = useCallback(
    () => onToggleLock?.(id, locked === true),
    [onToggleLock, id, locked],
  )
  const handleTogglePin = useCallback(
    () => onTogglePin?.(id, pinned === true),
    [onTogglePin, id, pinned],
  )

  const fontScale = useFontScale()

  const getPressableStyle = useCallback(
    ({ pressed }: { pressed: boolean }): ViewStyle[] => {
      const base: ViewStyle[] = [
        styles.container,
        grouped ? styles.containerGrouped : {},
        grouped && isFirst ? styles.containerGroupedFirst : {},
        grouped && isLast ? styles.containerGroupedLast : {},
        grouped && !isFirst ? styles.noTopPadding : {},
      ]
      if (selected || checked) return [...base, styles.containerSelected]
      if (pressed)
        return [...base, grouped ? styles.containerGroupedPressed : styles.containerPressed]
      return [...base, grouped ? styles.containerGroupedNormal : styles.containerNormal]
    },
    [selected, checked, styles, grouped, isFirst, isLast],
  )

  const titleStyle = useMemo(
    () => [styles.title, selected ? styles.titleSelected : styles.titleNormal],
    [selected, styles.title, styles.titleSelected, styles.titleNormal],
  )

  const titleLines = scaledLineCount(1, fontScale)
  const summaryLines = scaledLineCount(2, fontScale)
  const canShowThumbnail = !masked && !isAccessibilityTextSize(fontScale)
  const showThumbnail = !!imageUrl && !thumbError && canShowThumbnail
  // Prefer our own downscaled copy; the original is only ever a fallback, and never disk-cached.
  const imageThumbnailUri = useCachedImageThumbnail(imageUrl, showThumbnail)
  // A PDF only fills the slot when there is no image to show there.
  const pdfThumbnailUri = useCachedPdfThumbnail(
    pdfAttachment ?? null,
    canShowThumbnail && (!imageUrl || thumbError),
  )
  const displayTitle = title || t('noteCard.untitled')
  const accessibilityLabel = useMemo(() => {
    const parts = [displayTitle]
    if (pinned) parts.push(t('noteCard.a11y.pinned'))
    if (locked) parts.push(t('noteCard.a11y.locked'))
    parts.push(date)
    return parts.join(', ')
  }, [displayTitle, pinned, locked, date, t])
  const showAttachment = !masked && !summary && !!attachment
  const attachmentIcon = attachment ? ATTACHMENT_ICONS[attachment.kind] : null
  const deleteLabel = onRestore
    ? t('folderView.permanentlyDeleteTitle')
    : t('noteCard.actions.delete')
  const displaySummary = masked
    ? t('noteCard.lockedSummary')
    : summary || t('noteCard.noAdditionalText')

  const accessibilityActions = useMemo(() => {
    const actions: { name: string; label: string }[] = []
    if (onTogglePin)
      actions.push({
        name: NOTE_ACTION.togglePin,
        label: pinned ? t('noteCard.actions.unpin') : t('noteCard.actions.pin'),
      })
    if (onToggleLock)
      actions.push({
        name: NOTE_ACTION.toggleLock,
        label: locked ? t('noteCard.actions.unlock') : t('noteCard.actions.lock'),
      })
    if (onRestore) actions.push({ name: NOTE_ACTION.restore, label: t('noteCard.actions.restore') })
    if (onDelete) actions.push({ name: NOTE_ACTION.delete, label: deleteLabel })
    return actions
  }, [onTogglePin, onToggleLock, onRestore, onDelete, pinned, locked, deleteLabel, t])

  const handleAccessibilityAction = useCallback(
    (event: { nativeEvent: { actionName: string } }) => {
      const runner = {
        [NOTE_ACTION.togglePin]: handleTogglePin,
        [NOTE_ACTION.toggleLock]: handleToggleLock,
        [NOTE_ACTION.restore]: handleRestore,
        [NOTE_ACTION.delete]: handleDelete,
      }[event.nativeEvent.actionName]
      runner?.()
    },
    [handleTogglePin, handleToggleLock, handleRestore, handleDelete],
  )

  const entering = useMemo(
    () =>
      animationIndex <= ListMotion.enterMaxIndex
        ? FadeIn.duration(ListMotion.enterDuration).delay(animationIndex * ListMotion.enterStagger)
        : undefined,
    [animationIndex],
  )

  const hasActions =
    !selecting && (onDelete || onRestore || onMoveTo || onToggleLock || onTogglePin)

  const menuItems = useMemo(
    () =>
      buildNoteCardMenu({
        labels: {
          restore: t('noteCard.actions.restore'),
          moveTo: t('noteCard.actions.moveTo'),
          noFolders: t('noteCard.actions.noFolders'),
          pin: t('noteCard.actions.pin'),
          unpin: t('noteCard.actions.unpin'),
          lock: t('noteCard.actions.lock'),
          unlock: t('noteCard.actions.unlock'),
          delete: deleteLabel,
        },
        locked,
        pinned,
        canRestore: !!onRestore,
        canMove: !!onMoveTo,
        canToggleLock: !!onToggleLock,
        canTogglePin: !!onTogglePin,
        canDelete: !!onDelete,
        moveFolders,
      }),
    [
      t,
      deleteLabel,
      locked,
      pinned,
      onRestore,
      onMoveTo,
      onToggleLock,
      onTogglePin,
      onDelete,
      moveFolders,
    ],
  )

  const handleMenuSelect = useCallback(
    (actionId: string) => {
      if (actionId.startsWith(`${NOTE_ACTION.moveTo}:`)) {
        const folderId = actionId.slice(NOTE_ACTION.moveTo.length + 1)
        if (folderId !== 'none') onMoveTo?.(id, folderId)
        return
      }
      const runner = {
        [NOTE_ACTION.togglePin]: handleTogglePin,
        [NOTE_ACTION.toggleLock]: handleToggleLock,
        [NOTE_ACTION.restore]: handleRestore,
        [NOTE_ACTION.delete]: handleDelete,
      }[actionId]
      runner?.()
    },
    [id, onMoveTo, handleTogglePin, handleToggleLock, handleRestore, handleDelete],
  )

  const rowContent = (
    <RNView style={styles.row}>
      {selecting && (
        <RNView style={styles.selectionIndicator}>
          <SymbolIcon
            name={checked ? 'checkmark.circle.fill' : 'circle'}
            size={UI_ICON_SIZE_22}
            color={checked ? colors.primary : colors.textMuted}
          />
        </RNView>
      )}
      <RNView style={styles.content}>
        <RNView style={styles.titleRow}>
          <Text variant="bodyBold" numberOfLines={titleLines} style={titleStyle}>
            {displayTitle}
            {'  '}
            {pinned && <SymbolIcon name="pin.fill" size={UI_ICON_SIZE_14} color={lockIconColor} />}
            {locked &&
              (masked ? (
                <SymbolIcon name="lock.fill" size={UI_ICON_SIZE_14} color={lockIconColor} />
              ) : (
                <SymbolIcon name="lock.open.fill" size={UI_ICON_SIZE_14} color={lockIconColor} />
              ))}
          </Text>
        </RNView>

        {showAttachment && attachmentIcon ? (
          <RNView style={styles.attachmentRow}>
            <SymbolIcon name={attachmentIcon} size={UI_ICON_SIZE_14} color={colors.textSecondary} />
            <Text variant="caption" numberOfLines={1} style={styles.attachmentLabel}>
              {t(`noteCard.attachment.${attachment.kind}`, { count: attachment.count })}
            </Text>
          </RNView>
        ) : (
          <Text variant="caption" numberOfLines={summaryLines} style={styles.summary}>
            {displaySummary}
          </Text>
        )}

        {upload && (
          <RNView style={styles.uploadRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text variant="caption" numberOfLines={1} style={styles.uploadLabel}>
              {t('noteCard.uploading', { progress: upload.progress })}
            </Text>
          </RNView>
        )}

        <RNView style={styles.metadata}>
          {folderName && (
            <>
              <RNView style={styles.folderTag}>
                <SymbolIcon
                  name={FOLDER_ICON_SF[folderIconToken ?? ''] ?? FALLBACK_FOLDER_SF}
                  size={UI_ICON_SIZE_14}
                  style={styles.folderIcon}
                  color={colors.textSecondary}
                />
                <Text
                  variant="caption"
                  maxFontSizeMultiplier={MAX_FONT_SCALE_CHROME}
                  style={[styles.metadataText, isPearTheme && styles.metadataTextPearTheme]}
                >
                  {folderName}
                </Text>
              </RNView>
            </>
          )}
          <Text
            variant="caption"
            maxFontSizeMultiplier={MAX_FONT_SCALE_CHROME}
            style={styles.metadataText}
          >
            {date}
          </Text>
        </RNView>
      </RNView>

      {showThumbnail && (
        <Image
          source={imageThumbnailUri || imageUrl}
          style={styles.thumbnail}
          contentFit="cover"
          cachePolicy="memory"
          recyclingKey={id}
          transition={0}
          onError={handleThumbError}
        />
      )}

      {!showThumbnail && !!pdfThumbnailUri && (
        <Image
          source={pdfThumbnailUri}
          style={styles.thumbnail}
          contentFit="cover"
          contentPosition="top"
          cachePolicy="memory"
          recyclingKey={id}
          transition={0}
        />
      )}
    </RNView>
  )

  const card = (
    <MotionView entering={entering}>
      <Pressable
        onPress={handlePress}
        style={getPressableStyle}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityActions={accessibilityActions}
        onAccessibilityAction={handleAccessibilityAction}
      >
        {hasActions ? (
          <ContextMenuView
            items={menuItems}
            previewCornerRadius={Radii.md}
            previewScale={PREVIEW_SCALE}
            onSelect={handleMenuSelect}
            style={styles.menuHost}
          >
            {rowContent}
          </ContextMenuView>
        ) : (
          rowContent
        )}
        <RNView style={grouped && !isLast ? styles.rowDivider : styles.rowDividerHidden} />
      </Pressable>
    </MotionView>
  )

  return card
}, areNoteCardPropsEqual)

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    noTopPadding: {
      paddingTop: 0,
    },
    container: {
      paddingHorizontal: Space.base,
      borderRadius: Radii.md,
      paddingVertical: UI_SIZE_4,
    },
    containerNormal: {
      backgroundColor: theme.colors.transparent,
    },
    containerGrouped: {
      marginHorizontal: Space.base,
      marginVertical: 0,
      borderRadius: 0,
    },
    containerGroupedFirst: {
      borderTopLeftRadius: Radii.card,
      borderTopRightRadius: Radii.card,
    },
    containerGroupedLast: {
      borderBottomLeftRadius: Radii.card,
      borderBottomRightRadius: Radii.card,
    },
    containerGroupedNormal: {
      backgroundColor: theme.colors.cardSurface,
    },
    containerGroupedPressed: {
      backgroundColor: theme.colors.surfaceSecondary,
    },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginTop: UI_SIZE_4,
    },
    rowDividerHidden: {
      height: 0,
    },
    containerSelected: {
      backgroundColor: theme.colors.cardSelected,
    },
    containerPressed: {
      backgroundColor: theme.colors.cardPressed,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Space.md,
      gap: Space.md,
    },
    content: {
      ...commonStyles.flex1,
    },
    menuHost: {
      ...commonStyles.flex1,
    },
    selectionIndicator: {
      justifyContent: 'center',
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.xs,
    },
    title: {
      ...commonStyles.flex1,
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.extraBold,
      fontWeight: FontWeight.heavy,
      marginBottom: Space.xs,
      letterSpacing: LetterSpacing.tight,
    },
    titleNormal: {
      color: theme.colors.text,
    },
    titleSelected: {
      color: theme.colors.primary,
    },
    summary: {
      fontSize: FontSize.body,
      marginBottom: UI_SIZE_6,
      color: theme.colors.textSecondary,
      lineHeight: UI_SIZE_22,
    },
    attachmentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.xs,
      marginBottom: UI_SIZE_6,
    },
    attachmentLabel: {
      ...commonStyles.flex1,
      fontSize: FontSize.body,
      opacity: 0.8,
      color: theme.colors.textSecondary,
    },
    metadata: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    uploadRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.xs,
      marginBottom: Space.xs,
    },
    uploadLabel: {
      ...commonStyles.flex1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.primary,
    },
    folderTag: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    folderIcon: {
      marginRight: Space.xs,
    },
    metadataText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      letterSpacing: 0.5,
      color: theme.colors.textSecondary,
      marginRight: UI_SIZE_8,
    },
    metadataTextPearTheme: {
      color: theme.colors.textSecondary,
      opacity: 1,
    },
    thumbnail: {
      width: UI_SIZE_56,
      height: UI_SIZE_56,
      borderRadius: Radii.sm,
      flexShrink: 0,
    },
  })
  return styles
})
