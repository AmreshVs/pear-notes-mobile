import React, { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform, Pressable, StyleSheet, View as RNView } from 'react-native'
import { Easing, FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated'
import {
  ChevronRight,
  FileText,
  Folder as FolderIcon,
  LucideIcon,
  Trash2,
} from 'lucide-react-native'

import { MotionView } from '@/components/MotionView'
import {
  commonStyles,
  FontSize,
  FontWeight,
  LetterSpacing,
  Radii,
  Space,
  UI_ICON_SIZE_14,
  UI_ICON_SIZE_20,
  UI_SIZE_4,
  UI_STROKE_WIDTH_1_8,
} from '@/constants/commonStyles'

import { Text, Theme, useThemedStyles } from './Themed'

const ExpoUI = Platform.OS === 'ios' ? require('@expo/ui/swift-ui') : null

const ICON_MAP: Record<string, LucideIcon> = {
  Folder: FolderIcon,
  Trash: Trash2,
  All: FileText,
}

interface FolderRowProps {
  id: string
  name: string
  count?: number
  icon?: string
  selected?: boolean
  isSystem?: boolean
  animationIndex?: number
  onPress: (id: string) => void
  onRename?: (id: string, currentName: string) => void
  onDelete?: (id: string) => void
}

export const FolderRow = memo(function FolderRow({
  id,
  name,
  count,
  icon,
  selected,
  isSystem,
  animationIndex = 0,
  onPress,
  onRename,
  onDelete,
}: FolderRowProps) {
  const { t } = useTranslation()
  const styles = useThemedStyles(createStyles)
  const Icon = ICON_MAP[icon || 'Folder'] || FolderIcon

  const containerStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.container,
      selected && styles.containerSelected,
      pressed && styles.containerPressed,
    ],
    [styles, selected],
  )

  const row = (
    <MotionView
      entering={FadeIn.duration(220).delay(Math.min(animationIndex, 8) * 35)}
      exiting={FadeOut.duration(160)}
      layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
    >
      <Pressable onPress={() => onPress(id)} style={containerStyle} accessibilityRole="button">
        <RNView style={styles.leftContent}>
          <Icon
            size={UI_ICON_SIZE_20}
            color={styles.icon.color}
            strokeWidth={UI_STROKE_WIDTH_1_8}
          />
          <Text style={[styles.name, selected && styles.nameSelected]}>{name}</Text>
        </RNView>

        <RNView style={styles.rightContent}>
          {count !== undefined && count > 0 && <Text style={styles.count}>{count}</Text>}
          <RNView style={styles.chevronWrap}>
            <ChevronRight size={UI_ICON_SIZE_14} color={styles.count.color} />
          </RNView>
        </RNView>
      </Pressable>
    </MotionView>
  )

  if (isSystem || !ExpoUI || (!onRename && !onDelete)) {
    return row
  }

  const { Host, ContextMenu, Button } = ExpoUI

  return (
    <Host>
      <ContextMenu>
        <ContextMenu.Items>
          {onRename && (
            <Button
              label={t('folders.buttons.rename')}
              systemImage="pencil"
              onPress={() => onRename(id, name)}
            />
          )}
          {onDelete && (
            <Button
              label={t('folders.buttons.delete')}
              systemImage="trash"
              role="destructive"
              onPress={() => onDelete(id)}
            />
          )}
        </ContextMenu.Items>
        <ContextMenu.Trigger>{row}</ContextMenu.Trigger>
      </ContextMenu>
    </Host>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      ...commonStyles.rowBetween,
      paddingVertical: Space.md,
      paddingHorizontal: Space.base,
      borderRadius: Radii.md,
      marginVertical: 1,
      minHeight: 52,
      backgroundColor: theme.colors.transparent,
      borderWidth: 1,
      borderColor: theme.colors.transparent,
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
      backgroundColor: theme.colors.transparent,
    },
    icon: {
      color: theme.colors.primary,
    },
    name: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.medium,
      letterSpacing: LetterSpacing.tight,
      color: theme.colors.text,
      opacity: 0.9,
      paddingRight: UI_SIZE_4,
    },
    nameSelected: {
      opacity: 1,
    },
    rightContent: {
      ...commonStyles.row,
      gap: Space.sm,
      backgroundColor: theme.colors.transparent,
    },
    count: {
      fontSize: FontSize.subtitle,
      color: theme.colors.textSecondary,
      opacity: 0.6,
    },
    chevronWrap: {
      opacity: 0.55,
    },
  })
