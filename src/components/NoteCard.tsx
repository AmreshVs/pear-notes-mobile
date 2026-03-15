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

import { Text, useTheme } from './Themed'

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
  const { colors, isDark } = useTheme()
  const [thumbError, setThumbError] = useState(false)

  const imageUrl = useSelector((state: any) => getHyperdriveAddress(state, rawImageUrl))
  const borderStyle = useMemo(
    () => ({
      borderBottomWidth: !isLast ? StyleSheet.hairlineWidth : 0,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
    }),
    [isLast, isDark],
  )

  const selectedBg = useMemo(
    () => (isDark ? 'rgba(220, 163, 35, 0.12)' : 'rgba(220, 163, 35, 0.08)'),
    [isDark],
  )
  const pressedBg = useMemo(
    () => (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
    [isDark],
  )

  const getPressableStyle = useCallback(
    ({ pressed }: { pressed: boolean }): ViewStyle[] => [
      styles.container,
      borderStyle,
      { backgroundColor: selected ? selectedBg : pressed ? pressedBg : 'transparent' },
    ],
    [selected, selectedBg, pressedBg, borderStyle],
  )

  const titleStyle = useMemo(
    () => [styles.title, { color: selected ? colors.primary : colors.text }],
    [selected, colors.primary, colors.text],
  )

  const summaryStyle = useMemo(
    () => [styles.summary, { color: colors.textSecondary }],
    [colors.textSecondary],
  )

  const metadataTextStyle = useMemo(
    () => [styles.metadataText, { color: colors.textSecondary }],
    [colors.textSecondary],
  )

  const separatorStyle = useMemo(
    () => [styles.separator, { color: colors.textSecondary }],
    [colors.textSecondary],
  )

  const showThumbnail = !!imageUrl && !thumbError

  const card = (
    <Pressable onPress={onPress} style={getPressableStyle}>
      <RNView style={styles.row}>
        <RNView style={styles.content}>
          <Text variant="bodyBold" numberOfLines={1} style={titleStyle}>
            {title || 'Untitled'}
          </Text>

          <Text variant="caption" numberOfLines={2} style={summaryStyle}>
            {summary || 'No additional text'}
          </Text>

          <RNView style={styles.metadata}>
            {folderName && (
              <>
                <RNView style={styles.folderTag}>
                  <Folder size={11} color={colors.textSecondary} style={styles.folderIcon} />
                  <Text variant="caption" style={metadataTextStyle}>
                    {folderName}
                  </Text>
                </RNView>
                <Text variant="caption" style={separatorStyle}>
                  {'  ·  '}
                </Text>
              </>
            )}
            <Text variant="caption" style={metadataTextStyle}>
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

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  summary: {
    fontSize: 14,
    lineHeight: 19,
    opacity: 0.8,
    marginBottom: 8,
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
    marginRight: 4,
    opacity: 0.7,
  },
  metadataText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    opacity: 0.6,
  },
  separator: {
    opacity: 0.3,
    fontSize: 11,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: 'rgba(120,120,128,0.12)',
    flexShrink: 0,
  },
})
