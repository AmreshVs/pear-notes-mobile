import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View as RNView,
  type ViewStyle,
} from 'react-native'
import { FadeIn, FadeOutUp } from 'react-native-reanimated'
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
  Radii,
  Space,
  UI_ICON_SIZE_12,
  UI_ICON_SIZE_22,
  UI_SIZE_6,
  UI_SIZE_8,
  UI_SIZE_16,
  UI_SIZE_56,
} from '@/constants/commonStyles'
import { NOTE_ACTION } from '@/constants/noteActions'
import { useAndroidColorTheme } from '@/hooks/useAndroidColorTheme'
import { useIsNoteUnlocked } from '@/lib/noteLock'
import { useNoteUploadQueue } from '@/lib/uploadRegistry'
import {
  isAccessibilityTextSize,
  MAX_FONT_SCALE_CHROME,
  scaledLineCount,
} from '@/utils/dynamicType'
import { resolveHyperdriveUrl } from '@/utils/hyperdriveUrl'
import type { AttachmentInfo } from '@/utils/noteUtils'

import { createThemedStylesheet, Text, useFontScale, useTheme } from './Themed'

const ExpoUI = Platform.OS === 'ios' ? require('@expo/ui/swift-ui') : null

const ENTER_ANIMATION_MAX_INDEX = 8

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
  folderName?: string
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
  onCopy?: (id: string) => void
  onToggleLock?: (id: string, currentlyLocked: boolean) => void
  onTogglePin?: (id: string, currentlyPinned: boolean) => void
  moveFolders?: MoveFolder[]
  onMoveTo?: (id: string, folderId: string) => void
  onToggleSelect?: (id: string) => void
}

const MoveFolderButton = memo(function MoveFolderButton({
  noteId,
  folderId,
  folderName,
  onMoveTo,
}: {
  noteId: string
  folderId: string
  folderName: string
  onMoveTo: (id: string, folderId: string) => void
}) {
  const handlePress = useCallback(() => onMoveTo(noteId, folderId), [onMoveTo, noteId, folderId])
  return <ExpoUI.Button label={folderName} systemImage="folder" onPress={handlePress} />
})

const MoveToMenu = memo(function MoveToMenu({
  noteId,
  moveFolders,
  onMoveTo,
}: {
  noteId: string
  moveFolders?: MoveFolder[]
  onMoveTo: (id: string, folderId: string) => void
}) {
  const { t } = useTranslation()
  const renderFolder = useCallback(
    (folder: MoveFolder) => (
      <MoveFolderButton
        key={folder.id}
        noteId={noteId}
        folderId={folder.id}
        folderName={folder.name}
        onMoveTo={onMoveTo}
      />
    ),
    [noteId, onMoveTo],
  )

  return (
    <ExpoUI.Menu label={t('noteCard.actions.moveTo')} systemImage="folder.badge.plus">
      {moveFolders && moveFolders.length > 0 ? (
        moveFolders.map(renderFolder)
      ) : (
        <ExpoUI.Button
          label={t('noteCard.actions.noFolders')}
          systemImage="folder.badge.minus"
          onPress={noop}
        />
      )}
    </ExpoUI.Menu>
  )
})

function noop() {}

function areNoteCardPropsEqual(prev: NoteCardProps, next: NoteCardProps) {
  return (
    prev.id === next.id &&
    prev.title === next.title &&
    prev.date === next.date &&
    prev.summary === next.summary &&
    prev.attachment === next.attachment &&
    prev.rawImageUrl === next.rawImageUrl &&
    prev.folderName === next.folderName &&
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
    prev.onCopy === next.onCopy &&
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
  folderName,
  selected,
  selecting,
  checked,
  isFirst,
  isLast,
  grouped,
  animationIndex = 0,
  locked,
  pinned,
  onPress,
  onDelete,
  onRestore,
  onCopy,
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
  const handleCopy = useCallback(() => onCopy?.(id), [onCopy, id])
  const handleToggleLock = useCallback(
    () => onToggleLock?.(id, locked === true),
    [onToggleLock, id, locked],
  )
  const handleTogglePin = useCallback(
    () => onTogglePin?.(id, pinned === true),
    [onTogglePin, id, pinned],
  )

  const getPressableStyle = useCallback(
    ({ pressed }: { pressed: boolean }): ViewStyle[] => {
      const base: ViewStyle[] = [
        styles.container,
        grouped ? styles.containerGrouped : {},
        grouped && isFirst ? styles.containerGroupedFirst : {},
        grouped && isLast ? styles.containerGroupedLast : {},
        !grouped && !isLast ? styles.borderBottom : {},
      ]
      if (selected || checked) return [...base, styles.containerSelected]
      if (pressed)
        return [...base, grouped ? styles.containerGroupedPressed : styles.containerPressed]
      return [...base, grouped ? styles.containerGroupedNormal : styles.containerNormal]
    },
    [selected, checked, styles, grouped, isFirst, isLast],
  )

  const rowStyle = useMemo(
    () => (grouped && !isLast ? [styles.row, styles.rowSeparator] : styles.row),
    [grouped, isLast, styles.row, styles.rowSeparator],
  )

  const titleStyle = useMemo(
    () => [styles.title, selected ? styles.titleSelected : styles.titleNormal],
    [selected, styles.title, styles.titleSelected, styles.titleNormal],
  )

  const fontScale = useFontScale()
  const titleLines = scaledLineCount(1, fontScale)
  const summaryLines = scaledLineCount(2, fontScale)
  const showThumbnail = !!imageUrl && !thumbError && !masked && !isAccessibilityTextSize(fontScale)
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

  const entering = useMemo(
    () =>
      animationIndex <= ENTER_ANIMATION_MAX_INDEX
        ? FadeIn.duration(220).delay(animationIndex * 35)
        : undefined,
    [animationIndex],
  )

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
    if (onCopy) actions.push({ name: NOTE_ACTION.copy, label: t('noteCard.actions.copyNote') })
    if (onRestore) actions.push({ name: NOTE_ACTION.restore, label: t('noteCard.actions.restore') })
    if (onDelete) actions.push({ name: NOTE_ACTION.delete, label: deleteLabel })
    return actions
  }, [onTogglePin, onToggleLock, onCopy, onRestore, onDelete, pinned, locked, deleteLabel, t])

  const handleAccessibilityAction = useCallback(
    (event: { nativeEvent: { actionName: string } }) => {
      const runner = {
        [NOTE_ACTION.togglePin]: handleTogglePin,
        [NOTE_ACTION.toggleLock]: handleToggleLock,
        [NOTE_ACTION.copy]: handleCopy,
        [NOTE_ACTION.restore]: handleRestore,
        [NOTE_ACTION.delete]: handleDelete,
      }[event.nativeEvent.actionName]
      runner?.()
    },
    [handleTogglePin, handleToggleLock, handleCopy, handleRestore, handleDelete],
  )

  const card = (
    <MotionView entering={entering} exiting={FadeOutUp.duration(180)}>
      <Pressable
        onPress={handlePress}
        style={getPressableStyle}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityActions={accessibilityActions}
        onAccessibilityAction={handleAccessibilityAction}
      >
        <RNView style={rowStyle}>
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
              {pinned && (
                <SymbolIcon name="pin.fill" size={UI_ICON_SIZE_12} color={lockIconColor} />
              )}
              {locked &&
                (masked ? (
                  <SymbolIcon name="lock" size={UI_ICON_SIZE_12} color={lockIconColor} />
                ) : (
                  <SymbolIcon name="lock.open" size={UI_ICON_SIZE_12} color={lockIconColor} />
                ))}
              <Text variant="bodyBold" numberOfLines={titleLines} style={titleStyle}>
                {displayTitle}
              </Text>
            </RNView>

            {showAttachment && attachmentIcon ? (
              <RNView style={styles.attachmentRow}>
                <SymbolIcon
                  name={attachmentIcon}
                  size={UI_ICON_SIZE_12}
                  color={colors.textSecondary}
                />
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
                      name="folder"
                      size={UI_ICON_SIZE_12}
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
              source={imageUrl}
              style={styles.thumbnail}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={id}
              transition={0}
              onError={handleThumbError}
            />
          )}
        </RNView>
      </Pressable>
    </MotionView>
  )

  const hasActions =
    !selecting && (onDelete || onRestore || onCopy || onMoveTo || onToggleLock || onTogglePin)

  if (!ExpoUI || !hasActions) {
    return card
  }

  const { Host, ContextMenu, Button } = ExpoUI

  return (
    <Host>
      <ContextMenu>
        <ContextMenu.Items>
          {onRestore && (
            <Button
              label={t('noteCard.actions.restore')}
              systemImage="arrow.uturn.backward"
              onPress={handleRestore}
            />
          )}

          {onMoveTo && <MoveToMenu noteId={id} moveFolders={moveFolders} onMoveTo={onMoveTo} />}

          {onCopy && (
            <Button
              label={t('noteCard.actions.copyNote')}
              systemImage="doc.on.doc"
              onPress={handleCopy}
            />
          )}

          {onTogglePin && (
            <Button
              label={pinned ? t('noteCard.actions.unpin') : t('noteCard.actions.pin')}
              systemImage={pinned ? 'pin.slash' : 'pin'}
              onPress={handleTogglePin}
            />
          )}

          {onToggleLock && (
            <Button
              label={locked ? t('noteCard.actions.unlock') : t('noteCard.actions.lock')}
              systemImage={locked ? 'lock.slash' : 'lock'}
              onPress={handleToggleLock}
            />
          )}

          {onDelete && (
            <Button
              label={deleteLabel}
              systemImage="trash"
              role="destructive"
              onPress={handleDelete}
            />
          )}
        </ContextMenu.Items>
        <ContextMenu.Trigger>{card}</ContextMenu.Trigger>
      </ContextMenu>
    </Host>
  )
}, areNoteCardPropsEqual)

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: Space.base,
      borderRadius: Radii.md,
      marginVertical: 1,
    },
    containerNormal: {
      backgroundColor: theme.colors.transparent,
    },
    containerGrouped: {
      marginHorizontal: Space.base,
      marginVertical: 0,
      borderRadius: 0,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: theme.colors.borderSecondary,
    },
    containerGroupedFirst: {
      borderTopWidth: 1,
      borderTopLeftRadius: Radii.card,
      borderTopRightRadius: Radii.card,
    },
    containerGroupedLast: {
      borderBottomWidth: 1,
      borderBottomLeftRadius: Radii.card,
      borderBottomRightRadius: Radii.card,
      paddingVertical: UI_SIZE_16,
    },
    containerGroupedNormal: {
      backgroundColor: theme.colors.cardSurface,
    },
    containerGroupedPressed: {
      backgroundColor: theme.colors.surfaceSecondary,
    },
    rowSeparator: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      paddingVertical: UI_SIZE_16,
    },
    containerSelected: {
      backgroundColor: theme.colors.cardSelected,
    },
    containerPressed: {
      backgroundColor: theme.colors.cardPressed,
    },
    borderBottom: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.borderSecondary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Space.sm,
      gap: Space.md,
    },
    content: {
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
      lineHeight: 19,
      opacity: 0.8,
      marginBottom: UI_SIZE_6,
      color: theme.colors.textSecondary,
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
      fontSize: FontSize.caption,
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
      fontSize: FontSize.caption,
      fontWeight: FontWeight.heavy,
      fontFamily: FontFamily.extraBold,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      color: theme.colors.textSecondary,
      marginRight: UI_SIZE_8,
    },
    metadataTextPearTheme: {
      color: theme.colors.textSecondary,
      opacity: 1,
    },
    separator: {
      opacity: 0.3,
      fontSize: FontSize.caption,
      color: theme.colors.textSecondary,
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
