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

import type { InThisNoteProps } from './inThisNoteTypes'
import { NoteFindingsCard } from './NoteFindingsCard'
import { useNoteFindings } from './useNoteFindings'
import { type RelatedRow, useRelatedNotes } from './useRelatedNotes'

export function RelatedNotesModal({
  visible,
  noteId,
  anchor,
  showFindings,
  showRelated,
  addDisabled,
  getNoteHtml,
  onMakeTasks,
  onClose,
  onOpenNote,
}: InThisNoteProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const { colors } = useTheme()
  const { rows, noteTitle, isLoading, emptyTitle, emptyDescription } = useRelatedNotes(
    noteId,
    visible && showRelated,
  )
  const { findings, canAddToUpcoming, remindersOn, handleSetReminders, handleAddToUpcoming } =
    useNoteFindings({
      noteId,
      visible: visible && showFindings,
      getNoteHtml,
      title: noteTitle,
      anchor,
      onMakeTasks,
    })

  const handleOpen = useCallback(
    (key: string) => {
      onClose()
      onOpenNote(key)
    },
    [onClose, onOpenNote],
  )

  const renderRow = useCallback(
    (row: RelatedRow, index: number) => (
      <Pressable
        key={row.key}
        onPress={() => handleOpen(row.key)}
        accessibilityRole="button"
        accessibilityLabel={row.title}
        style={({ pressed }) => [
          styles.row,
          index > 0 && styles.rowDivider,
          pressed && commonStyles.pressed,
        ]}
      >
        <Text style={styles.rowTitle} numberOfLines={1}>
          {row.title}
        </Text>
        <Text style={styles.rowSnippet} numberOfLines={1}>
          {[row.snippet, row.date].filter(Boolean).join(' · ')}
        </Text>
      </Pressable>
    ),
    [handleOpen, styles],
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
            <Text style={styles.headerTitle}>{t('inThisNote.title')}</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {noteTitle}
            </Text>
          </RNView>
        </RNView>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {showFindings && findings.length > 0 && (
            <NoteFindingsCard
              findings={findings}
              canAddToUpcoming={canAddToUpcoming}
              addDisabled={addDisabled}
              remindersOn={remindersOn}
              onAddToUpcoming={handleAddToUpcoming}
              onSetReminders={handleSetReminders}
            />
          )}
          {!showRelated && findings.length === 0 && (
            <Text style={styles.emptyDesc}>{t('inThisNote.nothingFound')}</Text>
          )}
          {showRelated && (
            <RNView style={styles.section}>
              <Text style={styles.sectionLabel}>{t('relatedNotes.title')}</Text>
              {rows.length === 0 ? (
                <RNView style={styles.empty}>
                  <RNView style={styles.emptyIcon}>
                    <SymbolIcon name="link" size={UI_ICON_SIZE_20} color={colors.textMuted} />
                  </RNView>
                  <Text style={styles.emptyTitle}>{emptyTitle}</Text>
                  {!isLoading ? <Text style={styles.emptyDesc}>{emptyDescription}</Text> : null}
                </RNView>
              ) : (
                <RNView style={styles.card}>{rows.map(renderRow)}</RNView>
              )}
            </RNView>
          )}
          <Text style={styles.footer}>{t('inThisNote.footer')}</Text>
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
      gap: Space.xl,
      paddingHorizontal: Space.base,
      paddingBottom: Space.scrollBottom,
    },
    section: {
      gap: Space.sm,
    },
    sectionLabel: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.textSecondary,
      paddingHorizontal: Space.xs,
    },
    footer: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
      paddingHorizontal: Space.xs,
    },
    card: {
      backgroundColor: theme.colors.cardSurface,
      borderRadius: Radii.card,
      borderColor: theme.colors.borderSecondary,
      overflow: 'hidden',
    },
    rowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.separator,
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
