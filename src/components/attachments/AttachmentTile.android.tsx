import { memo, useCallback, useMemo } from 'react'
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { Image } from 'expo-image'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import type { AttachmentItem } from '@/components/attachments/attachments.types'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import {
  commonStyles,
  UI_ICON_SIZE_12,
  UI_ICON_SIZE_20,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_12,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { useAttachmentThumbnail } from '@/hooks/useAttachmentThumbnail'
import { androidRipple } from '@/lib/androidRipple'

type Props = {
  item: AttachmentItem
  label: string
  sizeStyle: ViewStyle
  onPress: (item: AttachmentItem) => void
  onLongPress: (item: AttachmentItem) => void
}

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
}

export const AttachmentTile = memo(function AttachmentTile({
  item,
  label,
  sizeStyle,
  onPress,
  onLongPress,
}: Props) {
  const styles = useStyles()
  const { colors } = useMD3Theme()
  const thumbnail = useAttachmentThumbnail(item)
  const ripple = useMemo(() => androidRipple(colors.onSurface), [colors.onSurface])
  const handlePress = useCallback(() => onPress(item), [onPress, item])
  const handleLongPress = useCallback(() => onLongPress(item), [onLongPress, item])
  const tileStyle = useMemo(() => [styles.tile, sizeStyle], [styles.tile, sizeStyle])

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      android_ripple={ripple}
      accessibilityRole="imagebutton"
      accessibilityLabel={label}
      style={tileStyle}
    >
      {thumbnail ? (
        <Image
          source={thumbnail}
          style={commonStyles.flex1}
          contentFit="cover"
          cachePolicy="memory"
          recyclingKey={item.url}
          transition={0}
        />
      ) : (
        <View style={styles.placeholder}>
          <MaterialCommunityIcons
            name="image-outline"
            size={UI_ICON_SIZE_20}
            color={colors.onSurfaceVariant}
          />
        </View>
      )}
      {item.local === false && (
        <View style={styles.cloud}>
          <MaterialCommunityIcons
            name="cloud-outline"
            size={UI_ICON_SIZE_12}
            color={colors.onSurface}
          />
        </View>
      )}
    </Pressable>
  )
})

const useStyles = createThemedStylesheetWithHooks((_theme, md3) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    tile: {
      borderRadius: UI_SIZE_12,
      overflow: 'hidden',
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
    },
    placeholder: {
      ...commonStyles.flex1,
      ...commonStyles.centered,
    },
    cloud: {
      position: 'absolute',
      right: UI_SIZE_4,
      bottom: UI_SIZE_4,
      paddingHorizontal: UI_SIZE_6,
      paddingVertical: 2,
      borderRadius: UI_SIZE_9999,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
    },
  })
  return styles
}, useMD3Theme)
