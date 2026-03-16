import {
  ChevronRight,
  FileText,
  Folder as FolderIcon,
  LucideIcon,
  Trash2,
} from 'lucide-react-native'
import React, { memo, useCallback, useMemo } from 'react'
import { Platform, Pressable, View as RNView, StyleSheet } from 'react-native'

import { Text, useTheme, View } from './Themed'

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
  const { colors, isDark } = useTheme()
  const Icon = ICON_MAP[icon || 'Folder'] || FolderIcon

  const containerStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.container,
      {
        backgroundColor: selected
          ? isDark
            ? 'rgba(220, 163, 35, 0.15)'
            : 'rgba(220, 163, 35, 0.1)'
          : pressed
            ? isDark
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(0,0,0,0.04)'
            : 'transparent',
      },
    ],
    [selected, isDark],
  )

  const iconBoxStyle = useMemo(
    () => [
      styles.iconBox,
      {
        backgroundColor: selected
          ? `${colors.primary}25`
          : isDark
            ? 'rgba(220,163,35,0.12)'
            : 'rgba(220,163,35,0.09)',
      },
    ],
    [selected, colors.primary, isDark],
  )

  const nameStyle = useMemo(
    () => [styles.name, { color: colors.text, opacity: selected ? 1 : 0.9 }],
    [colors.text, selected],
  )

  const countStyle = useMemo(
    () => [styles.count, { color: colors.textSecondary }],
    [colors.textSecondary],
  )

  const chevronWrapStyle = useMemo(() => ({ opacity: 0.55 }), [])

  const row = (
    <Pressable onPress={() => onPress(id)} style={containerStyle}>
      <RNView style={styles.leftContent}>
        <View style={iconBoxStyle}>
          <Icon size={17} color={colors.primary} strokeWidth={1.8} />
        </View>
        <Text style={nameStyle}>{name}</Text>
      </RNView>

      <RNView style={styles.rightContent}>
        {count !== undefined && count > 0 && <Text style={countStyle}>{count}</Text>}
        <RNView style={chevronWrapStyle}>
          <ChevronRight size={14} color={colors.textSecondary} />
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 1,
    minHeight: 52,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'transparent',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.4,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  count: {
    fontSize: 16,
    opacity: 0.6,
  },
})
