import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_16,
  UI_SIZE_2,
  UI_SIZE_8,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'

import type { AskThreadView } from './useAskVaultSheet'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  onSurfaceVariant?: string
}

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
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const handleOpen = useCallback(() => onOpen(thread), [onOpen, thread])
  const handleDelete = useCallback(() => onDelete(thread.id), [onDelete, thread.id])
  return (
    <View style={styles.row}>
      <Pressable
        onPress={handleOpen}
        android_ripple={ripple}
        accessibilityRole="button"
        style={styles.openArea}
      >
        <MaterialCommunityIcons
          name="history"
          size={UI_ICON_SIZE_16}
          color={c.onSurfaceVariant ?? c.onSurface}
        />
        <Text style={styles.text} numberOfLines={1}>
          {thread.title}
        </Text>
      </Pressable>
      <Pressable
        onPress={handleDelete}
        android_ripple={ripple}
        accessibilityRole="button"
        accessibilityLabel={t('localAi.askVault.deleteThread')}
        hitSlop={UI_SIZE_8}
        style={styles.remove}
      >
        <MaterialCommunityIcons
          name="close"
          size={UI_ICON_SIZE_16}
          color={c.onSurfaceVariant ?? c.onSurface}
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

const useStyles = createThemedStylesheetWithHooks((_theme, md3Theme) => {
  const c = md3Theme.colors as ExtendedColors
  const styles = StyleSheet.create({
    recent: {
      gap: UI_SIZE_2,
    },
    title: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onSurfaceVariant,
      textTransform: 'uppercase',
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
      color: c.onSurfaceVariant,
    },
    remove: {
      padding: UI_SIZE_2,
    },
  })
  return styles
}, useMD3Theme)
