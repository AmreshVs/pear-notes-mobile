import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, ScrollView, StyleSheet, View as RNView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_24,
  UI_SIZE_2,
  UI_SIZE_16,
  UI_SIZE_44,
  UI_SIZE_64,
} from '@/constants/commonStyles'

import { useRelatedNotes } from './useRelatedNotes'

type Props = {
  visible: boolean
  noteId: string
  onClose: () => void
  onOpenNote: (id: string) => void
}

export function RelatedNotesModal({ visible, noteId, onClose, onOpenNote }: Props) {
  const { t } = useTranslation()
  const styles = useStyles()
  const { colors } = useTheme()
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
      <RNView style={styles.root}>
        <RNView style={styles.header}>
          <Pressable
            onPress={onClose}
            hitSlop={UI_SIZE_16}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            style={({ pressed }) => [styles.iconBtn, pressed && commonStyles.pressed]}
          >
            <SymbolIcon name="chevron.left" size={UI_ICON_SIZE_24} color={colors.primary} />
          </Pressable>
          <RNView style={commonStyles.flex1}>
            <Text style={styles.headerTitle}>{t('relatedNotes.title')}</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {noteTitle}
            </Text>
          </RNView>
        </RNView>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {rows.length === 0 ? (
            <RNView style={styles.empty}>
              <RNView style={styles.emptyIcon}>
                <SymbolIcon name="link" size={UI_ICON_SIZE_20} color={colors.textMuted} />
              </RNView>
              <Text style={styles.emptyTitle}>{emptyTitle}</Text>
              {!isLoading ? <Text style={styles.emptyDesc}>{emptyDescription}</Text> : null}
            </RNView>
          ) : (
            <RNView style={styles.rows}>
              {rows.map((row) => (
                <RNView key={row.key} style={styles.card}>
                  <Pressable
                    onPress={() => handleOpen(row.key)}
                    accessibilityRole="button"
                    accessibilityLabel={row.title}
                    style={({ pressed }) => [styles.row, pressed && commonStyles.pressed]}
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
                </RNView>
              ))}
            </RNView>
          )}
        </ScrollView>
      </RNView>
    </Modal>
  )
}

const useRelatedHooks = () => {
  const insets = useSafeAreaInsets()
  return { insets }
}

const useStyles = createThemedStylesheetWithHooks((theme, { insets }) => {
  const styles = StyleSheet.create({
    root: {
      ...commonStyles.flex1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.sm,
      paddingTop: insets.top + Space.sm,
      paddingHorizontal: Space.base,
      paddingBottom: Space.md,
    },
    iconBtn: {
      width: UI_SIZE_44,
      height: UI_SIZE_44,
      ...commonStyles.centered,
    },
    headerTitle: {
      fontSize: FontSize.title,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
    },
    headerSubtitle: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
      marginTop: UI_SIZE_2,
    },
    scrollContent: {
      paddingHorizontal: Space.base,
      paddingBottom: Space.scrollBottom,
    },
    rows: {
      gap: Space.sm,
    },
    card: {
      backgroundColor: theme.colors.cardSurface,
      borderRadius: Radii.card,
      borderColor: theme.colors.borderSecondary,
      overflow: 'hidden',
    },
    row: {
      gap: UI_SIZE_2,
      padding: Space.md,
    },
    rowTitle: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
    },
    rowSnippet: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      lineHeight: FontSize.caption * 1.4,
      color: theme.colors.textMuted,
    },
    empty: {
      alignItems: 'center',
      gap: Space.sm,
      paddingVertical: Space.xxl,
    },
    emptyIcon: {
      width: UI_SIZE_64,
      height: UI_SIZE_64,
      borderRadius: Radii.card,
      backgroundColor: theme.colors.controlBackground,
      ...commonStyles.centered,
    },
    emptyTitle: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    emptyDesc: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: FontSize.body * 1.4,
    },
  })
  return styles
}, useRelatedHooks)
