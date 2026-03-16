import { getHyperdriveAddress } from '@pear-notes/core/store/slices/uiSlice.js'
import { Folder } from 'lucide-react-native'
import React, { memo, useCallback, useMemo, useState } from 'react'
import {
  Image,
  Platform,
  Pressable,
  View as RNView,
  StyleSheet,
  type ViewStyle,
} from 'react-native'
import { useSelector } from 'react-redux'

import { Text, Theme, useColors, useThemedStyles } from './Themed'

import { FontSize, FontWeight, LetterSpacing, Radii, Space } from '@/constants/commonStyles'

const ExpoUI = Platform.OS === 'ios' ? require('@expo/ui/swift-ui') : null

interface MoveFolder {
  id: string
  name: string
}

interface NoteCardProps {
  id: string
  title: string
  date: string
  summary: string
  rawImageUrl?: string | null
  folderName?: string
  selected?: boolean
  isLast?: boolean
  onPress: () => void
  onDelete?: () => void
  onCopy?: () => void
  moveFolders?: MoveFolder[]
  onMoveTo?: (folderId: string) => void
}

export const NoteCard = memo(function NoteCard({
  title,
  date,
  summary,
  rawImageUrl,
  folderName,
  selected,
  isLast,
  onPress,
  onDelete,
  onCopy,
  moveFolders,
  onMoveTo,
}: NoteCardProps) {
  const styles = useThemedStyles(createStyles)
  const colors = useColors()
  const [thumbError, setThumbError] = useState(false)

  const imageUrl = useSelector((state: any) => getHyperdriveAddress(state, rawImageUrl))

  const getPressableStyle = useCallback(
    ({ pressed }: { pressed: boolean }): ViewStyle[] => [
      styles.container,
      isLast ? {} : styles.borderBottom,
      {
        backgroundColor: selected
          ? colors.cardSelected
          : pressed
            ? colors.cardPressed
            : 'transparent',
      },
    ],
    [
      selected,
      colors.cardSelected,
      colors.cardPressed,
      styles.container,
      styles.borderBottom,
      isLast,
    ],
  )

  const titleStyle = useMemo(
    () => [styles.title, { color: selected ? colors.primary : colors.text }],
    [selected, colors.primary, colors.text, styles.title],
  )

  const showThumbnail = !!imageUrl && !thumbError

  const card = (
    <Pressable onPress={onPress} style={getPressableStyle}>
      <RNView style={styles.row}>
        <RNView style={styles.content}>
          <Text variant="bodyBold" numberOfLines={1} style={titleStyle}>
            {title || 'Untitled'}
          </Text>

          <Text variant="caption" numberOfLines={2} style={styles.summary}>
            {summary || 'No additional text'}
          </Text>

          <RNView style={styles.metadata}>
            {folderName && (
              <>
                <RNView style={styles.folderTag}>
                  <Folder size={11} color={colors.textSecondary} style={styles.folderIcon} />
                  <Text variant="caption" style={styles.metadataText}>
                    {folderName}
                  </Text>
                </RNView>
                <Text variant="caption" style={styles.separator}>
                  {'  ·  '}
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
  )

  const hasActions = onDelete || onCopy || onMoveTo

  if (!ExpoUI || !hasActions) {
    return card
  }

  const { Host, ContextMenu, Button, Menu } = ExpoUI

  return (
    <Host>
      <ContextMenu>
        <ContextMenu.Items>
          {onMoveTo && (
            <Menu label="Move to" systemImage="folder.badge.plus">
              {moveFolders && moveFolders.length > 0 ? (
                moveFolders.map((folder) => (
                  <Button
                    key={folder.id}
                    label={folder.name}
                    systemImage="folder"
                    onPress={() => onMoveTo(folder.id)}
                  />
                ))
              ) : (
                <Button
                  label="No folders available"
                  systemImage="folder.badge.minus"
                  onPress={() => {}}
                />
              )}
            </Menu>
          )}

          {onCopy && <Button label="Copy Note" systemImage="doc.on.doc" onPress={onCopy} />}

          {onDelete && (
            <Button label="Delete" systemImage="trash" role="destructive" onPress={onDelete} />
          )}
        </ContextMenu.Items>
        <ContextMenu.Trigger>{card}</ContextMenu.Trigger>
      </ContextMenu>
    </Host>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: Space.base,
      borderRadius: Radii.md,
      marginVertical: 1,
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
      flex: 1,
    },
    title: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.bold,
      marginBottom: Space.xs,
      letterSpacing: LetterSpacing.tight,
    },
    summary: {
      fontSize: FontSize.body,
      lineHeight: 19,
      opacity: 0.8,
      marginBottom: Space.xs,
      color: theme.colors.textSecondary,
    },
    metadata: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    folderTag: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    folderIcon: {
      marginRight: Space.xs,
      opacity: 0.7,
    },
    metadataText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      opacity: 0.6,
      color: theme.colors.textSecondary,
    },
    separator: {
      opacity: 0.3,
      fontSize: FontSize.caption,
      color: theme.colors.textSecondary,
    },
    thumbnail: {
      width: 56,
      height: 56,
      borderRadius: Radii.sm,
      backgroundColor: theme.colors.separator,
      flexShrink: 0,
    },
  })
