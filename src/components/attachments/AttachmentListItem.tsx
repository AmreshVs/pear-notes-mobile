import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View as RNView, type ViewStyle } from 'react-native'

import { AttachmentRow } from '@/components/attachments/AttachmentRow'
import type {
  AttachmentHeaderRow,
  AttachmentItem,
  AttachmentListRow,
  AttachmentPhotosRow,
  AttachmentSection,
} from '@/components/attachments/attachments.types'
import { AttachmentTile } from '@/components/attachments/AttachmentTile'
import { createThemedStylesheet, Text } from '@/components/Themed'
import { commonStyles, FontSize, FontWeight, Space, UI_SIZE_4 } from '@/constants/commonStyles'
import { attachmentDetail, attachmentName } from '@/utils/attachmentFormat'
import { attachmentKey } from '@/utils/attachmentRows'

import type { ContextMenuItem } from '../../../modules/expo-context-menu'

export const PHOTO_GAP = UI_SIZE_4

type Props = {
  row: AttachmentListRow
  opening: string | null
  tileStyle: ViewStyle
  sectionLabel: (section: AttachmentSection) => string
  menuItemsFor: (item: AttachmentItem) => ContextMenuItem[]
  onToggle: (key: string) => void
  onPress: (item: AttachmentItem) => void
  onMenu: (item: AttachmentItem, id: string) => void
}

type HeaderProps = {
  row: AttachmentHeaderRow
  label: string
  onToggle: (key: string) => void
}

const SectionHeader = memo(function SectionHeader({ row, label, onToggle }: HeaderProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const handleToggle = useCallback(() => onToggle(row.section.key), [onToggle, row.section.key])
  return (
    <RNView style={styles.header}>
      <Text style={styles.label} numberOfLines={1}>
        {t('attachmentsView.sectionTitle', { name: label, count: row.section.count })}
      </Text>
      {row.collapsible && (
        <Pressable
          onPress={handleToggle}
          hitSlop={Space.sm}
          accessibilityRole="button"
          style={({ pressed }) => pressed && commonStyles.pressed}
        >
          <Text style={styles.toggle}>
            {row.expanded ? t('attachmentsView.showLess') : t('attachmentsView.seeAll')}
          </Text>
        </Pressable>
      )}
    </RNView>
  )
})

type PhotosProps = {
  row: AttachmentPhotosRow
  opening: string | null
  tileStyle: ViewStyle
  menuItemsFor: (item: AttachmentItem) => ContextMenuItem[]
  onPress: (item: AttachmentItem) => void
  onMenu: (item: AttachmentItem, id: string) => void
}

const PhotosRow = memo(function PhotosRow({
  row,
  opening,
  tileStyle,
  menuItemsFor,
  onPress,
  onMenu,
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
        menuItems={menuItemsFor(item)}
        onPress={onPress}
        onMenu={onMenu}
      />
    ),
    [t, tileStyle, opening, menuItemsFor, onPress, onMenu],
  )
  return (
    <RNView
      style={[
        styles.photos,
        !row.last && styles.photosGap,
        row.last && row.filesFollow && styles.photosEnd,
      ]}
    >
      {row.items.map(renderPhoto)}
    </RNView>
  )
})

export const AttachmentListItem = memo(function AttachmentListItem({
  row,
  opening,
  tileStyle,
  sectionLabel,
  menuItemsFor,
  onToggle,
  onPress,
  onMenu,
}: Props) {
  const { t, i18n } = useTranslation()
  if (row.type === 'header') {
    return <SectionHeader row={row} label={sectionLabel(row.section)} onToggle={onToggle} />
  }
  if (row.type === 'photos') {
    return (
      <PhotosRow
        row={row}
        opening={opening}
        tileStyle={tileStyle}
        menuItemsFor={menuItemsFor}
        onPress={onPress}
        onMenu={onMenu}
      />
    )
  }
  return (
    <AttachmentRow
      item={row.item}
      name={attachmentName(row.item, t)}
      detail={attachmentDetail(row.item, t, i18n.language)}
      first={row.first}
      last={row.last}
      busy={row.key === opening}
      menuItems={menuItemsFor(row.item)}
      onPress={onPress}
      onMenu={onMenu}
    />
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    header: {
      ...commonStyles.rowBetween,
      gap: Space.md,
      marginTop: Space.xl,
      marginBottom: Space.md,
      marginHorizontal: Space.base + Space.xs,
    },
    label: {
      ...commonStyles.flex1,
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: theme.colors.textMuted,
    },
    toggle: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      color: theme.colors.primary,
    },
    photos: {
      ...commonStyles.row,
      gap: PHOTO_GAP,
      marginHorizontal: Space.base,
    },
    photosGap: {
      marginBottom: PHOTO_GAP,
    },
    photosEnd: {
      marginBottom: Space.md,
    },
  })
  return styles
})
