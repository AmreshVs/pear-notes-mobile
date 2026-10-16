import { memo, useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { Image } from 'expo-image'

import { formatBytes } from '@pear-notes/core/utils.js'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import type { AttachmentItem } from '@/components/attachments/attachments.types'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_14,
  UI_ICON_SIZE_20,
  UI_SIZE_2,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_44,
  UI_SIZE_64,
  UI_SIZE_76,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { useAttachmentThumbnail } from '@/hooks/useAttachmentThumbnail'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

type Props = {
  item: AttachmentItem
  name: string
  detail: string
  first: boolean
  busy: boolean
  onPress: (item: AttachmentItem) => void
  onLongPress: (item: AttachmentItem) => void
}

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
}

const KIND_ICONS: Record<string, string> = {
  photo: 'image-outline',
  pdf: 'file-pdf-box',
  audio: 'waveform',
  file: 'file-outline',
}

const DIVIDER_ALPHA = 0.12
const ICON_BG_ALPHA = 0.15
const BUSY_ALPHA = 0.7

export const AttachmentRow = memo(function AttachmentRow({
  item,
  name,
  detail,
  first,
  busy,
  onPress,
  onLongPress,
}: Props) {
  const styles = useStyles()
  const { colors } = useMD3Theme()
  const thumbnail = useAttachmentThumbnail(item)
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const handleImageError = useCallback(() => setFailedSource(thumbnail), [thumbnail])
  const ripple = useMemo(() => androidRipple(colors.onSurface), [colors.onSurface])
  const handlePress = useCallback(() => onPress(item), [onPress, item])
  const handleLongPress = useCallback(() => onLongPress(item), [onLongPress, item])
  const isAudio = item.kind === 'audio'
  const isPdf = item.kind === 'pdf'

  return (
    <View>
      {!first && <View style={styles.divider} />}
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        android_ripple={ripple}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${detail}`}
        style={styles.row}
      >
        <View style={[styles.icon, isAudio && styles.iconRound, isPdf && styles.iconPdf]}>
          {thumbnail && thumbnail !== failedSource ? (
            <Image
              source={thumbnail}
              style={styles.thumbnail}
              contentFit="cover"
              contentPosition="top"
              cachePolicy="memory"
              recyclingKey={item.url}
              transition={0}
              onError={handleImageError}
            />
          ) : (
            <MaterialCommunityIcons
              name={(KIND_ICONS[item.kind] ?? KIND_ICONS.file) as never}
              size={UI_ICON_SIZE_20}
              color={isPdf ? colors.primary : colors.onSurfaceVariant}
            />
          )}
          {busy && (
            <View style={styles.busy}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </View>
        <View style={styles.text}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.detail} numberOfLines={1}>
            {detail}
          </Text>
        </View>
        {item.local === false && (
          <MaterialCommunityIcons
            name="cloud-outline"
            size={UI_ICON_SIZE_14}
            color={colors.onSurfaceVariant}
          />
        )}
        {item.size > 0 && <Text style={styles.size}>{formatBytes(item.size)}</Text>}
      </Pressable>
    </View>
  )
})

const useStyles = createThemedStylesheetWithHooks((_theme, md3) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    row: {
      ...commonStyles.row,
      gap: UI_SIZE_12,
      minHeight: UI_SIZE_64,
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_12,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginLeft: UI_SIZE_76,
      marginRight: UI_SIZE_16,
      backgroundColor: hexWithAlpha(c.onSurface, DIVIDER_ALPHA),
    },
    icon: {
      ...commonStyles.centered,
      width: UI_SIZE_44,
      height: UI_SIZE_44,
      borderRadius: UI_SIZE_12,
      overflow: 'hidden',
      backgroundColor: hexWithAlpha(c.onSurface, 0.06),
    },
    iconRound: {
      borderRadius: UI_SIZE_9999,
    },
    iconPdf: {
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, ICON_BG_ALPHA),
    },
    busy: {
      ...StyleSheet.absoluteFill,
      ...commonStyles.centered,
      backgroundColor: hexWithAlpha(c.surface, BUSY_ALPHA),
    },
    thumbnail: {
      width: UI_SIZE_44,
      height: UI_SIZE_44,
    },
    text: {
      ...commonStyles.flex1,
      gap: UI_SIZE_2,
    },
    name: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
    },
    detail: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    size: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
  })
  return styles
}, useMD3Theme)
