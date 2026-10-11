import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Pressable,
  PressableStateCallbackType,
  StyleSheet,
  View as RNView,
} from 'react-native'
import { Image } from 'expo-image'
import { SymbolView, SymbolViewProps } from 'expo-symbols'

import { GlassView } from '@/components/GlassView'
import { SharedSummaryPanel } from '@/components/share/SharedSummaryPanel'
import { type SharedItemPreview, useSharedItemsTray } from '@/components/share/useSharedItemsTray'
import { createThemedStylesheet, Text, useColors } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_14,
  UI_ICON_SIZE_16,
  UI_SIZE_2,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_28,
  UI_SIZE_32,
  UI_SIZE_44,
} from '@/constants/commonStyles'
import type { SharedItemCategory } from '@/lib/shareIntake.types'
import { buildSharedTrayLabels } from '@/utils/sharedItemsSummary'

const CATEGORY_SYMBOLS: Record<SharedItemCategory, SymbolViewProps['name']> = {
  photo: 'photo',
  video: 'video',
  audio: 'waveform',
  file: 'doc',
  link: 'link',
  text: 'text.alignleft',
}

const TRAY_GLASS_INTENSITY = 12

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
  const colors = useColors()
  const tray = useSharedItemsTray({ isNoteOpen, canAddToNote })

  const containerStyle = useMemo(() => [styles.container, { bottom }], [styles.container, bottom])

  const getDiscardStyle = useCallback(
    ({ pressed }: PressableStateCallbackType) => [
      styles.discardButton,
      pressed && commonStyles.pressed,
    ],
    [styles.discardButton],
  )

  const getAddStyle = useCallback(
    ({ pressed }: PressableStateCallbackType) => [
      styles.addButton,
      pressed && commonStyles.pressed,
    ],
    [styles.addButton],
  )

  const renderPreview = useCallback(
    (preview: SharedItemPreview, index: number) => (
      <RNView key={preview.key} style={[styles.preview, index > 0 && styles.previewOverlap]}>
        {preview.imageUri ? (
          <Image
            source={preview.imageUri}
            style={styles.previewImage}
            contentFit="cover"
            recyclingKey={preview.key}
          />
        ) : (
          <SymbolView
            name={CATEGORY_SYMBOLS[preview.category]}
            size={UI_ICON_SIZE_16}
            tintColor={colors.textSecondary}
            fallback={<RNView />}
          />
        )}
      </RNView>
    ),
    [styles, colors.textSecondary],
  )

  if (!tray.isVisible) return null

  const { title, subtitle } = buildSharedTrayLabels(tray, t)
  const previewNodes = tray.previews.map(renderPreview)

  return (
    <RNView style={containerStyle} pointerEvents="box-none">
      <GlassView
        intensity={TRAY_GLASS_INTENSITY}
        borderRadius={Radii.card}
        style={styles.tray}
        isInteractive
      >
        <RNView style={styles.headerRow}>
          {tray.isPreparingOnly ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <RNView style={styles.previewStack}>{previewNodes}</RNView>
          )}
          <RNView style={styles.textColumn}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </RNView>
          {tray.isPreparingOnly ? null : (
            <Pressable
              onPress={tray.handleDiscard}
              hitSlop={Space.sm}
              accessibilityRole="button"
              accessibilityLabel={t('shareIntake.discard')}
              style={getDiscardStyle}
            >
              <SymbolView
                name="xmark"
                size={UI_ICON_SIZE_14}
                tintColor={colors.text}
                weight="semibold"
                fallback={<RNView />}
              />
            </Pressable>
          )}
        </RNView>

        <SharedSummaryPanel model={tray.shareSummary} isNoteOpen={isNoteOpen} />

        {tray.showAddAction ? (
          <Pressable onPress={onAddToNote} accessibilityRole="button" style={getAddStyle}>
            <Text style={styles.addLabel}>{t('shareIntake.addToNote')}</Text>
          </Pressable>
        ) : null}
      </GlassView>
    </RNView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      left: Space.base,
      right: Space.base,
      zIndex: 30,
    },
    tray: {
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_12,
      gap: UI_SIZE_12,
      overflow: 'hidden',
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
      width: UI_SIZE_32,
      height: UI_SIZE_32,
      borderRadius: Radii.sm,
      borderWidth: UI_SIZE_2,
      borderColor: theme.colors.cardSurface,
      backgroundColor: theme.colors.surfaceSecondary,
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
      color: theme.colors.text,
    },
    subtitle: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.textSecondary,
    },
    discardButton: {
      width: UI_SIZE_28,
      height: UI_SIZE_28,
      borderRadius: Radii.pill,
      backgroundColor: theme.colors.controlBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButton: {
      height: UI_SIZE_44,
      borderRadius: Radii.md,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addLabel: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.onPrimary,
    },
  })
  return styles
})
