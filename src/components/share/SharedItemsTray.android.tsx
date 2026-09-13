import { type ComponentProps, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import type { MD3Theme } from 'react-native-paper'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { Image } from 'expo-image'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { type SharedItemPreview, useSharedItemsTray } from '@/components/share/useSharedItemsTray'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import {
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_18,
  UI_ICON_SIZE_20,
  UI_SIZE_2,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_28,
  UI_SIZE_36,
  UI_SIZE_40,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import type { SharedItemCategory } from '@/lib/shareIntake.types'
import { buildSharedTrayLabels } from '@/utils/sharedItemsSummary'

type ExtendedColors = MD3Theme['colors'] & {
  surfaceContainerHigh?: string
  surfaceContainerHighest?: string
}

const CATEGORY_ICONS: Record<
  SharedItemCategory,
  ComponentProps<typeof MaterialCommunityIcons>['name']
> = {
  photo: 'image-outline',
  video: 'video-outline',
  audio: 'music-note-outline',
  file: 'file-outline',
  link: 'link-variant',
  text: 'text',
}

type SharedItemsTrayProps = {
  isNoteOpen: boolean
  canAddToNote: boolean
  bottom: number
  onAddToNote: () => void
}

export function SharedItemsTray({
  isNoteOpen,
  canAddToNote,
  bottom,
  onAddToNote,
}: SharedItemsTrayProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const tray = useSharedItemsTray({ isNoteOpen, canAddToNote })

  const containerStyle = useMemo(() => [styles.container, { bottom }], [styles.container, bottom])
  const surfaceRipple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const primaryRipple = useMemo(() => androidRipple(c.onPrimary), [c.onPrimary])

  const renderPreview = useCallback(
    (preview: SharedItemPreview, index: number) => (
      <View key={preview.key} style={[styles.preview, index > 0 && styles.previewOverlap]}>
        {preview.imageUri ? (
          <Image
            source={preview.imageUri}
            style={styles.previewImage}
            contentFit="cover"
            recyclingKey={preview.key}
          />
        ) : (
          <MaterialCommunityIcons
            name={CATEGORY_ICONS[preview.category]}
            size={UI_ICON_SIZE_18}
            color={c.onSurfaceVariant}
          />
        )}
      </View>
    ),
    [styles, c.onSurfaceVariant],
  )

  if (!tray.isVisible) return null

  const { title, subtitle } = buildSharedTrayLabels(tray, t)
  const previewNodes = tray.previews.map(renderPreview)

  return (
    <View style={containerStyle} pointerEvents="box-none">
      <View style={styles.tray}>
        <View style={styles.headerRow}>
          {tray.isPreparingOnly ? (
            <ActivityIndicator size="small" color={c.primary} />
          ) : (
            <View style={styles.previewStack}>{previewNodes}</View>
          )}
          <View style={styles.textColumn} accessibilityLiveRegion="polite">
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {tray.isPreparingOnly ? null : (
            <Pressable
              onPress={tray.handleDiscard}
              android_ripple={surfaceRipple}
              hitSlop={UI_SIZE_12}
              accessibilityRole="button"
              accessibilityLabel={t('shareIntake.discard')}
              style={styles.discardButton}
            >
              <MaterialCommunityIcons name="close" size={UI_ICON_SIZE_20} color={c.onSurface} />
            </Pressable>
          )}
        </View>

        {tray.showAddAction ? (
          <Pressable
            onPress={onAddToNote}
            android_ripple={primaryRipple}
            accessibilityRole="button"
            style={styles.addButton}
          >
            <Text style={styles.addLabel}>{t('shareIntake.addToNote')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const useTrayHooks = () => {
  const md3 = useMD3Theme()
  return { md3 }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3 }) => {
  const c = md3.colors as ExtendedColors
  const traySurface = c.surfaceContainerHigh ?? c.surfaceVariant
  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      left: UI_SIZE_16,
      right: UI_SIZE_16,
      zIndex: 30,
    },
    tray: {
      borderRadius: UI_SIZE_28,
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_12,
      gap: UI_SIZE_12,
      backgroundColor: traySurface,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_12,
    },
    previewStack: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    preview: {
      width: UI_SIZE_36,
      height: UI_SIZE_36,
      borderRadius: UI_SIZE_12,
      borderWidth: UI_SIZE_2,
      borderColor: traySurface,
      backgroundColor: c.surfaceContainerHighest ?? c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    previewOverlap: {
      marginLeft: -UI_SIZE_12,
    },
    previewImage: {
      width: '100%',
      height: '100%',
    },
    textColumn: {
      flex: 1,
      gap: UI_SIZE_2,
    },
    title: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
    },
    subtitle: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    discardButton: {
      width: UI_SIZE_40,
      height: UI_SIZE_40,
      borderRadius: UI_SIZE_9999,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButton: {
      height: UI_SIZE_40,
      borderRadius: UI_SIZE_9999,
      overflow: 'hidden',
      paddingHorizontal: UI_SIZE_20,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addLabel: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onPrimary,
    },
  })
  return styles
}, useTrayHooks)
