import { getColorTheme } from '@pear-notes/core/store/slices/settingsSlice.js'
import { getHyperdriveAddress } from '@pear-notes/core/store/slices/uiSlice.js'
import { Folder } from 'lucide-react-native'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Image,
  Platform,
  Pressable,
  View as RNView,
  StyleSheet,
  type ViewStyle,
} from 'react-native'
import Animated, { FadeIn, FadeOutUp, LinearTransition } from 'react-native-reanimated'
import { useSelector } from 'react-redux'

import { createThemedStylesheet, Text } from './Themed'

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
  animationIndex?: number
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
  animationIndex = 0,
  onPress,
  onDelete,
  onCopy,
  moveFolders,
  onMoveTo,
}: NoteCardProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const [thumbError, setThumbError] = useState(false)

  const imageUrl = useSelector((state: any) => getHyperdriveAddress(state, rawImageUrl))
  const colorTheme = useSelector(getColorTheme)
  const isPearTheme = colorTheme === 'pear'

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

  const showThumbnail = !!imageUrl && !thumbError

  const card = (
    <Animated.View
      entering={FadeIn.duration(220).delay(Math.min(animationIndex, 8) * 35)}
      exiting={FadeOutUp.duration(180)}
      layout={LinearTransition.springify().damping(20).stiffness(220)}
    >
      <Pressable onPress={onPress} style={getPressableStyle}>
        <RNView style={styles.row}>
          <RNView style={styles.content}>
            <Text variant="bodyBold" numberOfLines={1} style={titleStyle}>
              {title || t('noteCard.untitled')}
            </Text>

            <Text variant="caption" numberOfLines={2} style={styles.summary}>
              {summary || t('noteCard.noAdditionalText')}
            </Text>

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
            <Menu label={t('noteCard.actions.moveTo')} systemImage="folder.badge.plus">
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
              onPress={onCopy}
            />
          )}

          {onDelete && (
            <Button
              label={t('noteCard.actions.delete')}
              systemImage="trash"
              role="destructive"
              onPress={onDelete}
            />
          )}
        </ContextMenu.Items>
        <ContextMenu.Trigger>{card}</ContextMenu.Trigger>
      </ContextMenu>
    </Host>
  )
})

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
    title: {
      fontSize: FontSize.base,
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
      backgroundColor: theme.colors.separator,
      flexShrink: 0,
    },
  })
  return styles
})

