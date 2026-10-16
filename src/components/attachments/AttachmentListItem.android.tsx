import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { AttachmentRow } from '@/components/attachments/AttachmentRow.android'
import type {
  AttachmentFileRow,
  AttachmentHeaderRow,
  AttachmentItem,
  AttachmentListRow,
  AttachmentPhotosRow,
  AttachmentSection,
} from '@/components/attachments/attachments.types'
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
import { attachmentKey } from '@/utils/attachmentRows'

export const PHOTO_GAP = UI_SIZE_4

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
}

type Props = {
  row: AttachmentListRow
  opening: string | null
  tileStyle: ViewStyle
  sectionLabel: (section: AttachmentSection) => string
  onToggle: (key: string) => void
  onPress: (item: AttachmentItem) => void
  onLongPress: (item: AttachmentItem) => void
}

type HeaderProps = {
  row: AttachmentHeaderRow
  label: string
  onToggle: (key: string) => void
}

const SectionHeader = memo(function SectionHeader({ row, label, onToggle }: HeaderProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const { colors } = useMD3Theme()
  const ripple = useMemo(() => androidRipple(colors.primary), [colors.primary])
  const handleToggle = useCallback(() => onToggle(row.section.key), [onToggle, row.section.key])
  return (
    <View style={styles.header}>
      <Text style={styles.label} numberOfLines={1}>
        {t('attachmentsView.sectionTitle', { name: label, count: row.section.count })}
      </Text>
      {row.collapsible && (
        <Pressable
          onPress={handleToggle}
          android_ripple={ripple}
          accessibilityRole="button"
          style={styles.toggle}
        >
          <Text style={styles.toggleText}>
            {row.expanded ? t('attachmentsView.showLess') : t('attachmentsView.seeAll')}
          </Text>
        </Pressable>
      )}
    </View>
  )
})

type PhotosProps = {
  row: AttachmentPhotosRow
  opening: string | null
  tileStyle: ViewStyle
  onPress: (item: AttachmentItem) => void
  onLongPress: (item: AttachmentItem) => void
}

const PhotosRow = memo(function PhotosRow({
  row,
  opening,
  tileStyle,
  onPress,
  onLongPress,
}: PhotosProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const renderPhoto = useCallback(
    (item: AttachmentItem) => (
      <AttachmentTile
        key={attachmentKey(item)}
        item={item}
        label={attachmentName(item, t)}
        sizeStyle={tileStyle}
        busy={attachmentKey(item) === opening}
        onPress={onPress}
        onLongPress={onLongPress}
      />
    ),
    [t, tileStyle, opening, onPress, onLongPress],
  )
  return (
    <View
      style={[
        styles.photos,
        !row.last && styles.photosGap,
        row.last && row.filesFollow && styles.photosEnd,
      ]}
    >
      {row.items.map(renderPhoto)}
    </View>
  )
})

type FileProps = {
  row: AttachmentFileRow
  busy: boolean
  onPress: (item: AttachmentItem) => void
  onLongPress: (item: AttachmentItem) => void
}

const FileRow = memo(function FileRow({ row, busy, onPress, onLongPress }: FileProps) {
  const { t, i18n } = useTranslation()
  const styles = useStyles()
  return (
    <View style={[styles.card, row.first && styles.cardFirst, row.last && styles.cardLast]}>
      <AttachmentRow
        item={row.item}
        name={attachmentName(row.item, t)}
        detail={attachmentDetail(row.item, t, i18n.language)}
        first={row.first}
        busy={busy}
        onPress={onPress}
        onLongPress={onLongPress}
      />
    </View>
  )
})

export const AttachmentListItem = memo(function AttachmentListItem({
  row,
  opening,
  tileStyle,
  sectionLabel,
  onToggle,
  onPress,
  onLongPress,
}: Props) {
  if (row.type === 'header') {
    return <SectionHeader row={row} label={sectionLabel(row.section)} onToggle={onToggle} />
  }
  if (row.type === 'photos') {
    return (
      <PhotosRow
        row={row}
        opening={opening}
        tileStyle={tileStyle}
        onPress={onPress}
        onLongPress={onLongPress}
      />
    )
  }
  return (
    <FileRow row={row} busy={row.key === opening} onPress={onPress} onLongPress={onLongPress} />
  )
})

const useStyles = createThemedStylesheetWithHooks((_theme, md3) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    header: {
      ...commonStyles.rowBetween,
      gap: UI_SIZE_12,
      marginTop: UI_SIZE_24,
      marginBottom: UI_SIZE_12,
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
    photos: {
      ...commonStyles.row,
      gap: PHOTO_GAP,
      marginHorizontal: UI_SIZE_16,
    },
    photosGap: {
      marginBottom: PHOTO_GAP,
    },
    photosEnd: {
      marginBottom: UI_SIZE_12,
    },
    card: {
      marginHorizontal: UI_SIZE_16,
      overflow: 'hidden',
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
    },
    cardFirst: {
      borderTopLeftRadius: UI_SIZE_28,
      borderTopRightRadius: UI_SIZE_28,
    },
    cardLast: {
      borderBottomLeftRadius: UI_SIZE_28,
      borderBottomRightRadius: UI_SIZE_28,
    },
  })
  return styles
}, useMD3Theme)
