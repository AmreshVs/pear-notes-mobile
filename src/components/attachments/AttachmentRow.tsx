import { memo, useCallback } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View as RNView } from 'react-native'
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
  UI_ICON_SIZE_14,
  UI_ICON_SIZE_16,
  UI_SIZE_36,
  UI_SIZE_44,
  UI_SIZE_64,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { useAttachmentThumbnail } from '@/hooks/useAttachmentThumbnail'

import { type ContextMenuItem, ContextMenuView } from '../../../modules/expo-context-menu'

type Props = {
  item: AttachmentItem
  name: string
  detail: string
  first: boolean
  last: boolean
  busy: boolean
  menuItems: ContextMenuItem[]
  onPress: (item: AttachmentItem) => void
  onMenu: (item: AttachmentItem, id: string) => void
}

const KIND_ICONS: Record<string, IconName> = {
  pdf: 'doc.richtext',
  audio: 'waveform',
  file: 'doc',
}

const PREVIEW_SCALE = 0.96

export const AttachmentRow = memo(function AttachmentRow({
  item,
  name,
  detail,
  first,
  last,
  busy,
  menuItems,
  onPress,
  onMenu,
}: Props) {
  const { colors } = useTheme()
  const styles = useStyles()
  const thumbnail = useAttachmentThumbnail(item)
  const handlePress = useCallback(() => onPress(item), [onPress, item])
  const handleMenu = useCallback((id: string) => onMenu(item, id), [onMenu, item])
  const isAudio = item.kind === 'audio'
  const isPdf = item.kind === 'pdf'

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${detail}`}
      style={({ pressed }) => [
        styles.row,
        first && styles.rowFirst,
        last && styles.rowLast,
        pressed && commonStyles.pressed,
      ]}
    >
      <ContextMenuView
        items={menuItems}
        previewCornerRadius={Radii.md}
        previewScale={PREVIEW_SCALE}
        onSelect={handleMenu}
        style={styles.menuHost}
      >
        <RNView style={[styles.rowInner, !first && styles.rowDivider]}>
          <RNView style={[styles.icon, isAudio && styles.iconRound, isPdf && styles.iconPdf]}>
            {thumbnail ? (
              <Image
                source={thumbnail}
                style={styles.thumbnail}
                contentFit="cover"
                contentPosition="top"
                cachePolicy="memory"
                recyclingKey={item.url}
                transition={0}
              />
            ) : (
              <SymbolIcon
                name={KIND_ICONS[item.kind] ?? 'doc'}
                size={UI_ICON_SIZE_16}
                color={isPdf ? colors.primary : colors.textSecondary}
              />
            )}
            {busy && (
              <RNView style={styles.busy}>
                <ActivityIndicator size="small" color={colors.white} />
              </RNView>
            )}
          </RNView>
          <RNView style={styles.text}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.detail} numberOfLines={1}>
              {detail}
            </Text>
          </RNView>
          {item.local === false && (
            <SymbolIcon name="icloud" size={UI_ICON_SIZE_14} color={colors.textMuted} />
          )}
          {item.size > 0 && <Text style={styles.size}>{formatBytes(item.size)}</Text>}
        </RNView>
      </ContextMenuView>
    </Pressable>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    row: {
      marginHorizontal: Space.base,
      paddingHorizontal: Space.md + 2,
      backgroundColor: theme.colors.cardSurface,
    },
    rowFirst: {
      borderTopLeftRadius: Radii.lg + 2,
      borderTopRightRadius: Radii.lg + 2,
      borderCurve: 'continuous',
    },
    rowLast: {
      borderBottomLeftRadius: Radii.lg + 2,
      borderBottomRightRadius: Radii.lg + 2,
      borderCurve: 'continuous',
    },
    menuHost: {
      backgroundColor: theme.colors.cardSurface,
    },
    rowInner: {
      ...commonStyles.row,
      gap: Space.md,
      minHeight: UI_SIZE_64,
      paddingVertical: Space.md,
    },
    rowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.separator,
    },
    icon: {
      ...commonStyles.centered,
      width: UI_SIZE_36,
      height: UI_SIZE_44,
      borderRadius: Radii.xs + 2,
      overflow: 'hidden',
      backgroundColor: theme.colors.controlBackground,
    },
    iconRound: {
      height: UI_SIZE_36,
      borderRadius: UI_SIZE_9999,
    },
    iconPdf: {
      backgroundColor: theme.colors.cardSelected,
    },
    busy: {
      ...StyleSheet.absoluteFill,
      ...commonStyles.centered,
      backgroundColor: theme.colors.scrim,
    },
    thumbnail: {
      width: UI_SIZE_36,
      height: UI_SIZE_44,
    },
    text: {
      ...commonStyles.flex1,
      gap: 2,
    },
    name: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    detail: {
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
    },
    size: {
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
  })
  return styles
})
