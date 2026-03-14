import { Folder } from 'lucide-react-native'
import React from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { Text, View, useTheme } from './Themed'

interface NoteCardProps {
  id: string
  title: string
  date: string
  summary: string
  folderName?: string
  selected?: boolean
  isLast?: boolean
  onPress: () => void
}

export function NoteCard({
  title,
  date,
  summary,
  folderName,
  selected,
  isLast,
  onPress,
}: NoteCardProps) {
  const { colors, isDark } = useTheme()

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: selected
            ? isDark
              ? 'rgba(220, 163, 35, 0.12)'
              : 'rgba(220, 163, 35, 0.08)'
            : pressed
              ? isDark
                ? 'rgba(255,255,255,0.04)'
                : 'rgba(0,0,0,0.03)'
              : 'transparent',
          borderBottomWidth: !isLast ? StyleSheet.hairlineWidth : 0,
          borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
        },
      ]}
    >
      <View style={styles.content}>
        <Text
          variant="bodyBold"
          numberOfLines={1}
          style={[styles.title, { color: selected ? colors.primary : colors.text }]}
        >
          {title || 'Untitled'}
        </Text>

        <Text
          variant="caption"
          numberOfLines={2}
          style={[styles.summary, { color: colors.textSecondary }]}
        >
          {summary || 'No additional text'}
        </Text>

        <View style={styles.metadata}>
          {folderName && (
            <>
              <View style={styles.folderTag}>
                <Folder
                  size={11}
                  color={colors.textSecondary}
                  style={{ marginRight: 5, opacity: 0.7 }}
                />
                <Text
                  variant="caption"
                  style={[styles.metadataText, { color: colors.textSecondary }]}
                >
                  {folderName}
                </Text>
              </View>
              <Text variant="caption" style={[styles.separator, { color: colors.textSecondary }]}>
                •
              </Text>
            </>
          )}
          <Text variant="caption" style={[styles.metadataText, { color: colors.textSecondary }]}>
            {date}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    borderRadius: 12,
    marginVertical: 1,
  },
  content: {
    paddingVertical: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  summary: {
    fontSize: 14,
    lineHeight: 19,
    opacity: 0.8,
    marginBottom: 8,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadataText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    opacity: 0.6,
  },
  separator: {
    marginHorizontal: 8,
    opacity: 0.3,
  },
})
