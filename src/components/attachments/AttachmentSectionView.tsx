import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View as RNView, type ViewStyle } from 'react-native'

import { AttachmentRow } from '@/components/attachments/AttachmentRow'
import type { AttachmentItem, AttachmentSection } from '@/components/attachments/attachments.types'
import { AttachmentTile } from '@/components/attachments/AttachmentTile'
import { createThemedStylesheet, Text } from '@/components/Themed'
import { commonStyles, FontSize, FontWeight, Space, UI_SIZE_4 } from '@/constants/commonStyles'
import { attachmentDetail, attachmentName } from '@/utils/attachmentFormat'

import type { ContextMenuItem } from '../../../modules/expo-context-menu'

export const COLLAPSED_PHOTOS = 4
export const COLLAPSED_FILES = 2
export const PHOTO_GAP = UI_SIZE_4

type Props = {
  section: AttachmentSection
  label: string
  expanded: boolean
  tileStyle: ViewStyle
  menuItemsFor: (item: AttachmentItem) => ContextMenuItem[]
  onToggle: (key: string) => void
  onPress: (item: AttachmentItem) => void
  onMenu: (item: AttachmentItem, id: string) => void
}

export const AttachmentSectionView = memo(function AttachmentSectionView({
  section,
  label,
  expanded,
  tileStyle,
  menuItemsFor,
  onToggle,
  onPress,
  onMenu,
}: Props) {
  const { t, i18n } = useTranslation()
  const styles = useStyles()
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
        menuItems={menuItemsFor(item)}
        onPress={onPress}
        onMenu={onMenu}
      />
    ),
    [t, tileStyle, menuItemsFor, onPress, onMenu],
  )

  const renderFile = useCallback(
    (item: AttachmentItem, index: number) => (
      <AttachmentRow
        key={`${item.noteKey}|${item.url}`}
        item={item}
        name={attachmentName(item, t)}
        detail={attachmentDetail(item, t, i18n.language)}
        first={index === 0}
        last={index === files.length - 1}
        menuItems={menuItemsFor(item)}
        onPress={onPress}
        onMenu={onMenu}
      />
    ),
    [t, i18n.language, files.length, menuItemsFor, onPress, onMenu],
  )

  return (
    <RNView style={styles.section}>
      <RNView style={styles.header}>
        <Text style={styles.label} numberOfLines={1}>
          {t('attachmentsView.sectionTitle', { name: label, count: section.count })}
        </Text>
        {(hidden > 0 || expanded) && (
          <Pressable
            onPress={handleToggle}
            hitSlop={Space.sm}
            accessibilityRole="button"
            style={({ pressed }) => pressed && commonStyles.pressed}
          >
            <Text style={styles.toggle}>
              {expanded ? t('attachmentsView.showLess') : t('attachmentsView.seeAll')}
            </Text>
          </Pressable>
        )}
      </RNView>
      {photos.length > 0 && <RNView style={styles.grid}>{photos.map(renderPhoto)}</RNView>}
      {files.map(renderFile)}
    </RNView>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    section: {
      marginTop: Space.xl,
      gap: Space.md,
    },
    header: {
      ...commonStyles.rowBetween,
      gap: Space.md,
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
    grid: {
      ...commonStyles.row,
      flexWrap: 'wrap',
      gap: PHOTO_GAP,
      marginHorizontal: Space.base,
    },
  })
  return styles
})
