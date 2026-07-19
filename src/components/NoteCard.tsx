import { getColorTheme } from '@pear-notes/core/store/slices/settingsSlice.js'
import { getHyperdriveAddress } from '@pear-notes/core/store/slices/uiSlice.js'
import {
  Film,
  Folder,
  Image as ImageIcon,
  Lock,
  LockOpen,
  Mic,
  Paperclip,
  Pin,
} from 'lucide-react-native'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  View as RNView,
  StyleSheet,
  type ViewStyle,
} from 'react-native'
import Animated, { FadeIn, FadeOutUp } from 'react-native-reanimated'
import { useSelector } from 'react-redux'

import { createThemedStylesheet, Text, useTheme } from './Themed'

import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  LetterSpacing,
  Radii,
  Space,
  UI_ICON_SIZE_12,
  UI_SIZE_56,
} from '@/constants/commonStyles'
import { isNoteUnlocked, useNoteLockVersion } from '@/lib/noteLock'
import { useNoteUploadQueue } from '@/lib/uploadRegistry'
import type { AttachmentInfo } from '@/utils/noteUtils'

const ExpoUI = Platform.OS === 'ios' ? require('@expo/ui/swift-ui') : null

const ATTACHMENT_ICONS = {
  image: ImageIcon,
  video: Film,
  audio: Mic,
  file: Paperclip,
  mixed: Paperclip,
} as const

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
  isLast?: boolean
  animationIndex?: number
  locked?: boolean
  pinned?: boolean
  onPress: (id: string) => void
  onDelete?: (id: string) => void
  onCopy?: (id: string) => void
  onToggleLock?: (id: string, currentlyLocked: boolean) => void
  onTogglePin?: (id: string, currentlyPinned: boolean) => void
  moveFolders?: MoveFolder[]
  onMoveTo?: (id: string, folderId: string) => void
}

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
    prev.isLast === next.isLast &&
    prev.locked === next.locked &&
    prev.pinned === next.pinned &&
    prev.moveFolders === next.moveFolders &&
    prev.onPress === next.onPress &&
    prev.onDelete === next.onDelete &&
    prev.onCopy === next.onCopy &&
    prev.onToggleLock === next.onToggleLock &&
    prev.onTogglePin === next.onTogglePin &&
    prev.onMoveTo === next.onMoveTo
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
  isLast,
  animationIndex = 0,
  locked,
  pinned,
  onPress,
  onDelete,
  onCopy,
  onToggleLock,
  onTogglePin,
  moveFolders,
  onMoveTo,
}: NoteCardProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const { colors } = useTheme()
  const lockIconColor = colors.primary
  const [thumbError, setThumbError] = useState(false)
  useNoteLockVersion()
  const uploadQueue = useNoteUploadQueue(id)
  const upload = uploadQueue.activeItem
  const masked = locked === true && !isNoteUnlocked(id)

  const imageUrl = useSelector((state: any) => getHyperdriveAddress(state, rawImageUrl))
  const colorTheme = useSelector(getColorTheme)
  const isPearTheme = colorTheme === 'pear'

  const handlePress = useCallback(() => onPress(id), [onPress, id])
  const handleDelete = useCallback(() => onDelete?.(id), [onDelete, id])
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
    ({ pressed }: { pressed: boolean }): ViewStyle[] => [
      styles.container,
      !isLast ? styles.borderBottom : {},
      selected
        ? styles.containerSelected
        : pressed
          ? styles.containerPressed
          : styles.containerNormal,
    ],
    [
      selected,
      styles.container,
      styles.containerSelected,
      styles.containerPressed,
      styles.containerNormal,
      styles.borderBottom,
      isLast,
    ],
  )

  const titleStyle = useMemo(
    () => [styles.title, selected ? styles.titleSelected : styles.titleNormal],
    [selected, styles.title, styles.titleSelected, styles.titleNormal],
  )

  const showThumbnail = !!imageUrl && !thumbError && !masked
  const displayTitle = title || t('noteCard.untitled')
  const showAttachment = !masked && !summary && !!attachment
  const AttachmentIcon = attachment ? ATTACHMENT_ICONS[attachment.kind] : null
  const displaySummary = masked
    ? t('noteCard.lockedSummary')
    : summary || t('noteCard.noAdditionalText')

  const card = (
    <Animated.View
      entering={FadeIn.duration(220).delay(Math.min(animationIndex, 8) * 35)}
      exiting={FadeOutUp.duration(180)}
    >
      <Pressable onPress={handlePress} style={getPressableStyle}>
        <RNView style={styles.row}>
          <RNView style={styles.content}>
            <RNView style={styles.titleRow}>
              {pinned && <Pin size={UI_ICON_SIZE_12} color={lockIconColor} fill={lockIconColor} />}
              {locked &&
                (masked ? (
                  <Lock size={UI_ICON_SIZE_12} color={lockIconColor} />
                ) : (
                  <LockOpen size={UI_ICON_SIZE_12} color={lockIconColor} />
                ))}
              <Text variant="bodyBold" numberOfLines={1} style={titleStyle}>
                {displayTitle}
              </Text>
            </RNView>

            {showAttachment && AttachmentIcon ? (
              <RNView style={styles.attachmentRow}>
                <AttachmentIcon size={UI_ICON_SIZE_12} color={colors.textSecondary} />
                <Text variant="caption" numberOfLines={1} style={styles.attachmentLabel}>
                  {t(`noteCard.attachment.${attachment.kind}`, { count: attachment.count })}
                </Text>
              </RNView>
            ) : (
              <Text variant="caption" numberOfLines={2} style={styles.summary}>
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
                    <Folder size={UI_ICON_SIZE_12} style={styles.folderIcon} />
                    <Text
                      variant="caption"
                      style={[styles.metadataText, isPearTheme && styles.metadataTextPearTheme]}
                    >
                      {folderName}
                    </Text>
                  </RNView>
                  <Text variant="caption" style={styles.separator}>
                    {'  •  '}
                  </Text>
                </>
              )}
              <Text variant="caption" style={styles.metadataText}>
                {date}
              </Text>
            </RNView>
          </RNView>

          {showThumbnail && (
            <Image
              source={{ uri: imageUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
              onError={() => setThumbError(true)}
            />
          )}
        </RNView>
      </Pressable>
    </Animated.View>
  )

  const hasActions = onDelete || onCopy || onMoveTo || onToggleLock || onTogglePin

  if (!ExpoUI || !hasActions) {
    return card
  }

  const { Host, ContextMenu, Button, Menu } = ExpoUI

  return (
    <Host>
      <ContextMenu>
        <ContextMenu.Items>
          {onMoveTo && (
            <Menu label={t('noteCard.actions.moveTo')} systemImage="folder.badge.plus">
              {moveFolders && moveFolders.length > 0 ? (
                moveFolders.map((folder) => (
                  <Button
                    key={folder.id}
                    label={folder.name}
                    systemImage="folder"
                    onPress={() => onMoveTo(id, folder.id)}
                  />
                ))
              ) : (
                <Button
                  label={t('noteCard.actions.noFolders')}
                  systemImage="folder.badge.minus"
                  onPress={() => {}}
                />
              )}
            </Menu>
          )}

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
              label={t('noteCard.actions.delete')}
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
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.xs,
    },
    title: {
      ...commonStyles.flex1,
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
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
      marginBottom: Space.xs,
      color: theme.colors.textSecondary,
    },
    attachmentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.xs,
      marginBottom: Space.xs,
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
      opacity: 0.7,
      color: theme.colors.textSecondary,
    },
    metadataText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      opacity: 0.6,
      color: theme.colors.textSecondary,
    },
    metadataTextPearTheme: {
      color: theme.colors.primary,
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
