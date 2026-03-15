import { Folder } from 'lucide-react-native'
import React, { memo, useCallback, useMemo } from 'react'
import { Pressable, StyleSheet, type ViewStyle } from 'react-native'

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

export const NoteCard = memo(function NoteCard({
  title,
  date,
  summary,
  folderName,
  selected,
  isLast,
  onPress,
}: NoteCardProps) {
  const { colors, isDark } = useTheme()

  const containerStyle = useMemo(
    () => ({
      borderBottomWidth: !isLast ? StyleSheet.hairlineWidth : 0,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
    }),
    [isLast, isDark],
  )

  const selectedBg = useMemo(
    () => (isDark ? 'rgba(220, 163, 35, 0.12)' : 'rgba(220, 163, 35, 0.08)'),
    [isDark],
  )
  const pressedBg = useMemo(
    () => (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
    [isDark],
  )

  const getPressableStyle = useCallback(
    ({ pressed }: { pressed: boolean }): ViewStyle[] => [
      styles.container,
      containerStyle,
      {
        backgroundColor: selected ? selectedBg : pressed ? pressedBg : 'transparent',
      },
    ],
    [selected, selectedBg, pressedBg, containerStyle],
  )

  const titleStyle = useMemo(
    () => [styles.title, { color: selected ? colors.primary : colors.text }],
    [selected, colors.primary, colors.text],
  )

  const summaryStyle = useMemo(
    () => [styles.summary, { color: colors.textSecondary }],
    [colors.textSecondary],
  )

  const metadataTextStyle = useMemo(
    () => [styles.metadataText, { color: colors.textSecondary }],
    [colors.textSecondary],
  )

  const separatorStyle = useMemo(
    () => [styles.separator, { color: colors.textSecondary }],
    [colors.textSecondary],
  )

  const folderIconStyle = useMemo(() => ({ marginRight: 5, opacity: 0.7 }), [])

  return (
    <Pressable onPress={onPress} style={getPressableStyle}>
      <View style={styles.content}>
        <Text variant="bodyBold" numberOfLines={1} style={titleStyle}>
          {title || 'Untitled'}
        </Text>

        <Text variant="caption" numberOfLines={2} style={summaryStyle}>
          {summary || 'No additional text'}
        </Text>

        <View style={styles.metadata}>
          {folderName && (
            <>
              <View style={styles.folderTag}>
                <Folder size={11} color={colors.textSecondary} style={folderIconStyle} />
                <Text variant="caption" style={metadataTextStyle}>
                  {folderName}
                </Text>
              </View>
              <Text variant="caption" style={separatorStyle}>
                •
              </Text>
            </>
          )}
          <Text variant="caption" style={metadataTextStyle}>
            {date}
          </Text>
        </View>
      </View>
    </Pressable>
  )
})

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
