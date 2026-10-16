import { memo, useCallback } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View as RNView,
  type ViewStyle,
} from 'react-native'
import { Image } from 'expo-image'

import type { AttachmentItem } from '@/components/attachments/attachments.types'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, useTheme } from '@/components/Themed'
import {
  commonStyles,
  Radii,
  UI_ICON_SIZE_12,
  UI_ICON_SIZE_18,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { useAttachmentThumbnail } from '@/hooks/useAttachmentThumbnail'

import { type ContextMenuItem, ContextMenuView } from '../../../modules/expo-context-menu'

type Props = {
  item: AttachmentItem
  label: string
  sizeStyle: ViewStyle
  busy: boolean
  menuItems: ContextMenuItem[]
  onPress: (item: AttachmentItem) => void
  onMenu: (item: AttachmentItem, id: string) => void
}

const PREVIEW_SCALE = 0.92

export const AttachmentTile = memo(function AttachmentTile({
  item,
  label,
  sizeStyle,
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

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="imagebutton"
      accessibilityLabel={label}
      style={({ pressed }) => [sizeStyle, pressed && commonStyles.pressed]}
    >
      <ContextMenuView
        items={menuItems}
        previewCornerRadius={Radii.sm}
        previewScale={PREVIEW_SCALE}
        onSelect={handleMenu}
        style={styles.tile}
      >
        {thumbnail ? (
          <Image
            source={thumbnail}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory"
            recyclingKey={item.url}
            transition={0}
          />
        ) : (
          <RNView style={styles.placeholder}>
            <SymbolIcon name="photo" size={UI_ICON_SIZE_18} color={colors.textMuted} />
          </RNView>
        )}
        {item.local === false && (
          <RNView style={styles.cloud}>
            <SymbolIcon name="icloud" size={UI_ICON_SIZE_12} color={colors.white} />
          </RNView>
        )}
        {busy && (
          <RNView style={styles.busy}>
            <ActivityIndicator size="small" color={colors.white} />
          </RNView>
        )}
      </ContextMenuView>
    </Pressable>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    tile: {
      ...commonStyles.flex1,
      borderRadius: Radii.sm,
      overflow: 'hidden',
      backgroundColor: theme.colors.controlBackground,
    },
    image: {
      ...commonStyles.flex1,
    },
    placeholder: {
      ...commonStyles.flex1,
      ...commonStyles.centered,
    },
    busy: {
      ...StyleSheet.absoluteFill,
      ...commonStyles.centered,
      backgroundColor: theme.colors.scrim,
    },
    cloud: {
      position: 'absolute',
      right: UI_SIZE_4,
      bottom: UI_SIZE_4,
      paddingHorizontal: UI_SIZE_6,
      paddingVertical: 2,
      borderRadius: UI_SIZE_9999,
      backgroundColor: theme.colors.scrim,
    },
  })
  return styles
})
