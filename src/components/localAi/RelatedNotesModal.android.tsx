import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_24,
  UI_ICON_SIZE_36,
  UI_SIZE_2,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_28,
  UI_SIZE_44,
  UI_SIZE_72,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

import { useRelatedNotes } from './useRelatedNotes'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  onSurfaceVariant?: string
}

const rippleBorderless = { borderless: true }

type Props = {
  visible: boolean
  noteId: string
  onClose: () => void
  onOpenNote: (id: string) => void
}

export function RelatedNotesModal({ visible, noteId, onClose, onOpenNote }: Props) {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const { rows, noteTitle, isLoading, emptyTitle, emptyDescription } = useRelatedNotes(
    noteId,
    visible,
  )

  const handleOpen = useCallback(
    (key: string) => {
      onClose()
      onOpenNote(key)
    },
    [onClose, onOpenNote],
  )

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            android_ripple={rippleBorderless}
            hitSlop={UI_SIZE_12}
            style={styles.iconBtn}
          >
            <MaterialCommunityIcons name="arrow-left" size={UI_ICON_SIZE_24} color={c.primary} />
          </Pressable>
          <View style={commonStyles.flex1}>
            <Text style={styles.headerTitle}>{t('relatedNotes.title')}</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {noteTitle}
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {rows.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <MaterialCommunityIcons
                  name="link-variant"
                  size={UI_ICON_SIZE_36}
                  color={c.onSurfaceVariant}
                />
              </View>
              <Text style={styles.emptyTitle}>{emptyTitle}</Text>
              {!isLoading ? <Text style={styles.emptyDesc}>{emptyDescription}</Text> : null}
            </View>
          ) : (
            <View style={styles.rows}>
              {rows.map((row) => (
                <View key={row.key} style={styles.card}>
                  <Pressable
                    onPress={() => handleOpen(row.key)}
                    accessibilityRole="button"
                    accessibilityLabel={row.title}
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  >
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {row.title}
                    </Text>
                    {row.snippet ? (
                      <Text style={styles.rowSnippet} numberOfLines={2}>
                        {row.snippet}
                      </Text>
                    ) : null}
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

const useRelatedHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3, insets }) => {
  const c = md3.colors as ExtendedColors

  const styles = StyleSheet.create({
    root: {
      ...commonStyles.flex1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_16,
      paddingTop: insets.top + UI_SIZE_16,
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: UI_SIZE_16,
    },
    iconBtn: {
      width: UI_SIZE_44,
      height: UI_SIZE_44,
      ...commonStyles.centered,
      overflow: 'hidden',
      borderRadius: UI_SIZE_9999,
    },
    headerTitle: {
      fontSize: FontSize.title,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onSurface,
    },
    headerSubtitle: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      marginTop: UI_SIZE_2,
    },
    scrollContent: {
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: Space.scrollBottom,
    },
    rows: {
      gap: Space.sm,
    },
    card: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      overflow: 'hidden',
    },
    row: {
      gap: UI_SIZE_2,
      padding: Space.base,
    },
    rowPressed: {
      backgroundColor: hexWithAlpha(c.onSurface, 0.08),
    },
    rowTitle: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onSurface,
    },
    rowSnippet: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      lineHeight: FontSize.caption * 1.4,
      color: c.onSurfaceVariant,
    },
    empty: {
      alignItems: 'center',
      gap: Space.sm,
      paddingVertical: Space.xxl,
    },
    emptyIcon: {
      width: UI_SIZE_72,
      height: UI_SIZE_72,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.onSurface, 0.06),
      ...commonStyles.centered,
    },
    emptyTitle: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurface,
    },
    emptyDesc: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: FontSize.body * 1.4,
    },
  })
  return styles
}, useRelatedHooks)
