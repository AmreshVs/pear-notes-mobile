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

import type { InThisNoteProps } from './inThisNoteTypes'
import { NoteFindingsCard } from './NoteFindingsCard'
import { useNoteFindings } from './useNoteFindings'
import { type RelatedRow, useRelatedNotes } from './useRelatedNotes'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  onSurfaceVariant?: string
}

const rippleBorderless = { borderless: true }

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
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
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
    (row: RelatedRow) => (
      <Pressable
        key={row.key}
        onPress={() => handleOpen(row.key)}
        accessibilityRole="button"
        accessibilityLabel={row.title}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
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
            <Text style={styles.headerTitle}>{t('inThisNote.title')}</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {noteTitle}
            </Text>
          </View>
        </View>

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
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t('relatedNotes.title')}</Text>
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
                <View style={styles.card}>{rows.map(renderRow)}</View>
              )}
            </View>
          )}
          <Text style={styles.footer}>{t('inThisNote.footer')}</Text>
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
      gap: Space.xl,
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: Space.scrollBottom,
    },
    section: {
      gap: Space.sm,
    },
    sectionLabel: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.primary,
      paddingHorizontal: Space.xs,
    },
    footer: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      paddingHorizontal: Space.xs,
    },
    card: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      overflow: 'hidden',
      paddingVertical: Space.xs,
    },
    row: {
      gap: UI_SIZE_2,
      paddingHorizontal: UI_SIZE_20,
      paddingVertical: UI_SIZE_12,
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
