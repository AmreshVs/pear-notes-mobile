import {
  ChevronRight,
  FileText,
  Folder as FolderIcon,
  LucideIcon,
  Trash2,
} from 'lucide-react-native'
import React, { memo, useCallback } from 'react'
import { Platform, Pressable, View as RNView, StyleSheet } from 'react-native'

import { Text, Theme, useThemedStyles, View } from './Themed'

import { FontSize, FontWeight, LetterSpacing, Radii, Space } from '@/constants/commonStyles'

// @expo/ui is iOS-only — import lazily so Android doesn't crash
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
  onPress,
  onRename,
  onDelete,
}: FolderRowProps) {
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
    <Pressable onPress={() => onPress(id)} style={containerStyle}>
      <RNView style={styles.leftContent}>
        <View style={[styles.iconBox, selected && styles.iconBoxSelected]}>
          <Icon size={17} color={styles.icon.color} strokeWidth={1.8} />
        </View>
        <Text style={[styles.name, selected && styles.nameSelected]}>{name}</Text>
      </RNView>

      <RNView style={styles.rightContent}>
        {count !== undefined && count > 0 && <Text style={styles.count}>{count}</Text>}
        <RNView style={styles.chevronWrap}>
          <ChevronRight size={14} color={styles.count.color} />
        </RNView>
      </RNView>
    </Pressable>
  )

  // System folders and Android: plain row, no context menu
  if (isSystem || !ExpoUI || (!onRename && !onDelete)) {
    return row
  }

  const { Host, ContextMenu, Button } = ExpoUI

  return (
    <Host>
      <ContextMenu>
        <ContextMenu.Items>
          {onRename && (
            <Button label="Rename" systemImage="pencil" onPress={() => onRename(id, name)} />
          )}
          {onDelete && (
            <Button
              label="Delete"
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: Space.md,
      paddingHorizontal: Space.base,
      borderRadius: Radii.md,
      marginVertical: 1,
      minHeight: 52,
      backgroundColor: 'transparent',
    },
    containerSelected: {
      backgroundColor: theme.colors.cardSelected,
    },
    containerPressed: {
      backgroundColor: theme.colors.cardPressed,
    },
    leftContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: 'transparent',
    },
    iconBox: {
      width: Space.xxl,
      height: Space.xxl,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.borderSecondary,
    },
    iconBoxSelected: {
      backgroundColor: `${theme.colors.primary}25`,
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
    },
    nameSelected: {
      opacity: 1,
    },
    rightContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.sm,
      backgroundColor: 'transparent',
    },
    count: {
      fontSize: FontSize.base,
      color: theme.colors.textSecondary,
      opacity: 0.6,
    },
    chevronWrap: {
      opacity: 0.55,
    },
  })
