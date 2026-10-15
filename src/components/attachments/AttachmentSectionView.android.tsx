import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { AttachmentRow } from '@/components/attachments/AttachmentRow.android'
import type { AttachmentItem, AttachmentSection } from '@/components/attachments/attachments.types'
import { AttachmentTile } from '@/components/attachments/AttachmentTile.android'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_SIZE_4,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_24,
  UI_SIZE_28,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { attachmentDetail, attachmentName } from '@/utils/attachmentFormat'

export const COLLAPSED_PHOTOS = 4
export const COLLAPSED_FILES = 2
export const PHOTO_GAP = UI_SIZE_4

type Props = {
  section: AttachmentSection
  label: string
  expanded: boolean
  tileStyle: ViewStyle
  onToggle: (key: string) => void
  onPress: (item: AttachmentItem) => void
  onLongPress: (item: AttachmentItem) => void
}

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
}

export const AttachmentSectionView = memo(function AttachmentSectionView({
  section,
  label,
  expanded,
  tileStyle,
  onToggle,
  onPress,
  onLongPress,
}: Props) {
  const { t, i18n } = useTranslation()
  const styles = useStyles()
  const { colors } = useMD3Theme()
  const ripple = useMemo(() => androidRipple(colors.primary), [colors.primary])
  const photos = expanded ? section.photos : section.photos.slice(0, COLLAPSED_PHOTOS)
  const files = expanded ? section.files : section.files.slice(0, COLLAPSED_FILES)
  const hidden = section.count - photos.length - files.length
  const handleToggle = useCallback(() => onToggle(section.key), [onToggle, section.key])

  const renderPhoto = useCallback(
    (item: AttachmentItem) => (
      <AttachmentTile
        key={`${item.noteKey}|${item.url}`}
        item={item}
        label={attachmentName(item, t)}
        sizeStyle={tileStyle}
        onPress={onPress}
        onLongPress={onLongPress}
      />
    ),
    [t, tileStyle, onPress, onLongPress],
  )

  const renderFile = useCallback(
    (item: AttachmentItem, index: number) => (
      <AttachmentRow
        key={`${item.noteKey}|${item.url}`}
        item={item}
        name={attachmentName(item, t)}
        detail={attachmentDetail(item, t, i18n.language)}
        first={index === 0}
        onPress={onPress}
        onLongPress={onLongPress}
      />
    ),
    [t, i18n.language, onPress, onLongPress],
  )

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.label} numberOfLines={1}>
          {t('attachmentsView.sectionTitle', { name: label, count: section.count })}
        </Text>
        {(hidden > 0 || expanded) && (
          <Pressable
            onPress={handleToggle}
            android_ripple={ripple}
            accessibilityRole="button"
            style={styles.toggle}
          >
            <Text style={styles.toggleText}>
              {expanded ? t('attachmentsView.showLess') : t('attachmentsView.seeAll')}
            </Text>
          </Pressable>
        )}
      </View>
      {photos.length > 0 && <View style={styles.grid}>{photos.map(renderPhoto)}</View>}
      {files.length > 0 && <View style={styles.card}>{files.map(renderFile)}</View>}
    </View>
  )
})

const useStyles = createThemedStylesheetWithHooks((_theme, md3) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    section: {
      marginTop: UI_SIZE_24,
      gap: UI_SIZE_12,
    },
    header: {
      ...commonStyles.rowBetween,
      gap: UI_SIZE_12,
      paddingHorizontal: UI_SIZE_16,
    },
    label: {
      ...commonStyles.flex1,
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurfaceVariant,
    },
    toggle: {
      overflow: 'hidden',
      paddingHorizontal: UI_SIZE_12,
      paddingVertical: UI_SIZE_4,
      borderRadius: UI_SIZE_9999,
    },
    toggleText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.primary,
    },
    grid: {
      ...commonStyles.row,
      flexWrap: 'wrap',
      gap: PHOTO_GAP,
      marginHorizontal: UI_SIZE_16,
    },
    card: {
      marginHorizontal: UI_SIZE_16,
      borderRadius: UI_SIZE_28,
      overflow: 'hidden',
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
    },
  })
  return styles
}, useMD3Theme)
