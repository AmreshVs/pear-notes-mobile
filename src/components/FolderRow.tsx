import {
  ChevronRight,
  FileText,
  Folder as FolderIcon,
  LucideIcon,
  Trash2,
} from 'lucide-react-native'
import React from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { Text, useTheme, View } from './Themed'

const ICON_MAP: Record<string, LucideIcon> = {
  Folder: FolderIcon,
  Trash: Trash2,
  All: FileText,
}

interface FolderRowProps {
  name: string
  count?: number
  icon?: string
  selected?: boolean
  onPress: () => void
}

export function FolderRow({ name, count, icon, selected, onPress }: FolderRowProps) {
  const { colors, isDark } = useTheme()
  const Icon = ICON_MAP[icon || 'Folder'] || FolderIcon

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
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
      ]}
    >
      <View style={styles.leftContent}>
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor: selected
                ? `${colors.primary}25`
                : isDark
                  ? 'rgba(220,163,35,0.12)'
                  : 'rgba(220,163,35,0.09)',
            },
          ]}
        >
          <Icon size={17} color={colors.primary} strokeWidth={1.8} />
        </View>
        <Text
          style={[
            styles.name,
            { color: colors.text, opacity: selected ? 1 : 0.9 },
          ]}
        >
          {name}
        </Text>
      </View>

      <View style={styles.rightContent}>
        {count !== undefined && count > 0 && (
          <Text style={[styles.count, { color: colors.textSecondary }]}>
            {count}
          </Text>
        )}
        <ChevronRight size={14} color={colors.textSecondary} style={{ opacity: 0.4 }} />
      </View>
    </Pressable>
  )
}

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
  },
  count: {
    fontSize: 16,
    opacity: 0.6,
  },
})
