import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_12,
  UI_SIZE_2,
  UI_SIZE_8,
} from '@/constants/commonStyles'

import type { AskThreadView } from './useAskVaultSheet'

interface AskVaultRecentProps {
  threads: AskThreadView[]
  onOpen: (thread: AskThreadView) => void
  onDelete: (id: string) => void
}

interface RecentRowProps {
  thread: AskThreadView
  onOpen: (thread: AskThreadView) => void
  onDelete: (id: string) => void
}

const RecentRow = memo(function RecentRow({ thread, onOpen, onDelete }: RecentRowProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const handleOpen = useCallback(() => onOpen(thread), [onOpen, thread])
  const handleDelete = useCallback(() => onDelete(thread.id), [onDelete, thread.id])
  return (
    <View style={styles.row}>
      <Pressable
        onPress={handleOpen}
        accessibilityRole="button"
        style={({ pressed }) => [styles.openArea, pressed && commonStyles.pressed]}
      >
        <SymbolView
          name="clock.arrow.circlepath"
          size={UI_ICON_SIZE_12}
          tintColor={colors.textMuted}
          weight="semibold"
        />
        <Text style={styles.text} numberOfLines={1}>
          {thread.title}
        </Text>
      </Pressable>
      <Pressable
        onPress={handleDelete}
        accessibilityRole="button"
        accessibilityLabel={t('localAi.askVault.deleteThread')}
        hitSlop={UI_SIZE_8}
        style={({ pressed }) => [styles.remove, pressed && commonStyles.pressed]}
      >
        <SymbolView
          name="xmark"
          size={UI_ICON_SIZE_12}
          tintColor={colors.textMuted}
          weight="semibold"
        />
      </Pressable>
    </View>
  )
})

export const AskVaultRecent = memo(function AskVaultRecent({
  threads,
  onOpen,
  onDelete,
}: AskVaultRecentProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const renderThread = useCallback(
    (thread: AskThreadView) => (
      <RecentRow key={thread.id} thread={thread} onOpen={onOpen} onDelete={onDelete} />
    ),
    [onDelete, onOpen],
  )
  return (
    <View style={styles.recent}>
      <Text style={styles.title}>{t('localAi.askVault.recent')}</Text>
      {threads.map(renderThread)}
    </View>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    recent: {
      gap: UI_SIZE_2,
    },
    title: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: theme.colors.textMuted,
    },
    row: {
      ...commonStyles.row,
      gap: UI_SIZE_8,
    },
    openArea: {
      ...commonStyles.row,
      ...commonStyles.flex1,
      gap: UI_SIZE_8,
      paddingVertical: UI_SIZE_8,
    },
    text: {
      ...commonStyles.flex1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.textSecondary,
    },
    remove: {
      padding: UI_SIZE_2,
    },
  })
  return styles
})
