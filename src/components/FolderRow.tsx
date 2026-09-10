import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View as RNView } from 'react-native'
import { Easing, FadeIn, LinearTransition } from 'react-native-reanimated'

import { Divider } from '@/components/Divider'
import { MotionView } from '@/components/MotionView'
import { SymbolIcon } from '@/components/SymbolIcon'
import {
  commonStyles,
  FontSize,
  FontWeight,
  ListMotion,
  Radii,
  Space,
  UI_ICON_SIZE_14,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_20,
  UI_SIZE_24,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { FOLDER_ACTION } from '@/constants/folderActions'
import { FALLBACK_FOLDER_SF, FOLDER_ICON_SF } from '@/constants/folderIcons'
import { MAX_FONT_SCALE_CHROME } from '@/utils/dynamicType'

import { ContextMenuView } from '../../modules/expo-context-menu'

import { Text, Theme, useThemedStyles } from './Themed'

interface FolderRowProps {
  id: string
  name: string
  count?: number
  icon?: string
  selected?: boolean
  isSystem?: boolean
  grouped?: boolean
  isLast?: boolean
  animationIndex?: number
  onPress: (id: string) => void
  onRename?: (id: string, currentName: string) => void
  onChangeIcon?: (id: string) => void
  onDelete?: (id: string) => void
}

export const FolderRow = memo(function FolderRow({
  id,
  name,
  count,
  icon,
  selected,
  isSystem,
  grouped,
  isLast,
  animationIndex = 0,
  onPress,
  onRename,
  onChangeIcon,
  onDelete,
}: FolderRowProps) {
  const { t } = useTranslation()
  const styles = useThemedStyles(createStyles)
  const commonThemedStyles = useCommonThemedStyles()
  const iconName = FOLDER_ICON_SF[icon ?? ''] ?? FALLBACK_FOLDER_SF

  const containerStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.container,
      grouped && styles.containerGrouped,
      isLast && styles.containerLast,
      selected && styles.containerSelected,
      pressed && styles.containerPressed,
    ],
    [styles, selected, grouped, isLast],
  )

  const entering = useMemo(
    () =>
      animationIndex <= ListMotion.enterMaxIndex
        ? FadeIn.duration(ListMotion.enterDuration).delay(animationIndex * ListMotion.enterStagger)
        : undefined,
    [animationIndex],
  )

  const row = (
    <MotionView
      entering={entering}
      layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
    >
      <Pressable onPress={() => onPress(id)} style={containerStyle} accessibilityRole="button">
        <RNView style={styles.leftContent}>
          <RNView style={commonThemedStyles.iconBox34}>
            <SymbolIcon name={iconName} size={UI_SIZE_20} color={styles.icon.color} />
          </RNView>
          <Text
            style={[styles.name, selected && styles.nameSelected]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {name}
          </Text>
        </RNView>

        <RNView style={styles.rightContent}>
          {count !== undefined && count > 0 && (
            <RNView style={styles.countBadge}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE_CHROME} style={styles.count}>
                {count}
              </Text>
            </RNView>
          )}
          <RNView style={styles.chevronWrap}>
            <SymbolIcon name="chevron.forward" size={UI_ICON_SIZE_14} color={styles.count.color} />
          </RNView>
        </RNView>
      </Pressable>
      <RNView style={isLast ? styles.dividerWrapHidden : styles.dividerWrap}>
        <Divider />
      </RNView>
    </MotionView>
  )

  const menuItems = useMemo(() => {
    const items = []
    if (onRename) {
      items.push({
        id: FOLDER_ACTION.rename,
        title: t('folders.buttons.rename'),
        systemImage: 'pencil',
      })
    }
    if (onChangeIcon) {
      items.push({
        id: FOLDER_ACTION.changeIcon,
        title: t('folders.buttons.changeIcon'),
        systemImage: 'square.grid.2x2',
      })
    }
    if (onDelete) {
      items.push({
        id: FOLDER_ACTION.delete,
        title: t('folders.buttons.delete'),
        systemImage: 'trash',
        destructive: true,
      })
    }
    return items
  }, [onRename, onChangeIcon, onDelete, t])

  const handleMenuSelect = useCallback(
    (actionId: string) => {
      if (actionId === FOLDER_ACTION.rename) onRename?.(id, name)
      if (actionId === FOLDER_ACTION.changeIcon) onChangeIcon?.(id)
      if (actionId === FOLDER_ACTION.delete) onDelete?.(id)
    },
    [id, name, onRename, onChangeIcon, onDelete],
  )

  if (isSystem || (!onRename && !onChangeIcon && !onDelete)) {
    return row
  }

  return (
    <ContextMenuView items={menuItems} onSelect={handleMenuSelect} previewCornerRadius={Radii.card}>
      {row}
    </ContextMenuView>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      ...commonStyles.rowBetween,
      paddingVertical: Space.base,
      paddingHorizontal: Space.base,
      borderRadius: Radii.md,
      marginVertical: 1,
      minHeight: 52,
      backgroundColor: theme.colors.transparent,
      borderColor: theme.colors.border,
    },
    containerGrouped: {
      borderRadius: 0,
      marginVertical: 0,
    },
    containerLast: {},
    dividerWrap: {
      marginHorizontal: Space.base,
    },
    dividerWrapHidden: {
      height: 0,
      overflow: 'hidden',
    },
    containerSelected: {
      backgroundColor: theme.colors.cardSelected,
      borderColor: theme.colors.cardSelectedBorder,
    },
    containerPressed: {
      backgroundColor: theme.colors.cardPressed,
    },
    leftContent: {
      ...commonStyles.row,
      gap: 14,
      flex: 1,
      minWidth: 0,
      backgroundColor: theme.colors.transparent,
    },
    icon: {
      color: theme.colors.primary,
    },
    name: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
      flex: 1,
      paddingRight: UI_SIZE_4,
    },
    nameSelected: {
      opacity: 1,
    },
    rightContent: {
      ...commonStyles.row,
      gap: Space.sm,
      flexShrink: 0,
      backgroundColor: theme.colors.transparent,
    },
    countBadge: {
      ...commonStyles.centered,
      flexShrink: 0,
      minWidth: UI_SIZE_24,
      height: UI_SIZE_24,
      paddingHorizontal: UI_SIZE_6,
      borderRadius: Radii.pill,
      backgroundColor: theme.colors.controlBackground,
    },
    count: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      color: theme.colors.textSecondary,
    },
    chevronWrap: {
      opacity: 0.55,
    },
  })
