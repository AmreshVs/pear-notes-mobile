import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, RefreshControl, SectionList, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'

import { isRecapEmpty } from '@pear-notes/core/store/services/recap.js'

import { CollapsedNavTitle } from '@/components/CollapsedNavTitle'
import { Divider } from '@/components/Divider'
import { ScreenEdgeFades } from '@/components/ScreenEdgeFades'
import { createThemedStylesheet, Text, View } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  LetterSpacing,
  Space,
  UI_SIZE_42,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import {
  LIST_BATCH_RENDER_COUNT,
  LIST_INITIAL_RENDER_COUNT,
  LIST_WINDOW_SIZE,
} from '@/constants/constants'
import { HIDDEN_SCROLL_EDGE_EFFECTS } from '@/constants/navigation'
import {
  type Recap,
  type RecapRow,
  type RecapSection,
  recapSections,
  useRecap,
} from '@/hooks/useRecap'
import { useTitleCollapse } from '@/hooks/useTitleCollapse'
import { formatUpcomingDue } from '@/hooks/useUpcomingTasks'
import { useNoteEditor } from '@/providers/NoteEditorContext'

export function RecapPane() {
  const { t, i18n } = useTranslation()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const { openNote } = useNoteEditor()
  const { recap, loaded, refreshing, refresh } = useRecap()
  const { isTitleCollapsed, handleTitleBlockLayout, scrollProps } = useTitleCollapse()

  const sections = useMemo(() => recapSections(recap), [recap])
  const empty = loaded && isRecapEmpty(recap as Recap)

  const headerTitle = useCallback(() => <CollapsedNavTitle title={t('tools.recap')} />, [t])

  const screenOptions = useMemo(
    () => ({
      headerTitle: isTitleCollapsed ? headerTitle : '',
      headerLargeTitle: false,
      headerTransparent: true,
      scrollEdgeEffects: HIDDEN_SCROLL_EDGE_EFFECTS,
    }),
    [isTitleCollapsed, headerTitle],
  )

  const renderItem = useCallback(
    ({ item, index, section }: { item: RecapRow; index: number; section: RecapSection }) => (
      <View>
        <Pressable
          onPress={() => openNote(item.kind === 'task' ? item.task.noteKey : item.note.key)}
          style={({ pressed }) => [styles.row, pressed && commonStyles.pressed]}
          accessibilityRole="button"
        >
          {item.kind === 'task' ? (
            <>
              <Text style={styles.rowTitle} numberOfLines={2}>
                {item.task.text}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {formatUpcomingDue(item.task, i18n.language)} •{' '}
                {item.task.title || t('noteCard.untitled')}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.note.title || t('noteCard.untitled')}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {new Date(item.note.updatedAt).toLocaleDateString(i18n.language, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </>
          )}
        </Pressable>
        {index < section.data.length - 1 && (
          <View style={styles.divider}>
            <Divider />
          </View>
        )}
      </View>
    ),
    [openNote, i18n.language, t, styles.row, styles.rowTitle, styles.meta, styles.divider],
  )

  const renderSectionHeader = useCallback(
    ({ section }: { section: RecapSection }) => (
      <View style={styles.sectionHeader}>
        <Text style={commonThemedStyles.sectionCamelCase}>
          {section.id === 'edited'
            ? t('recap.edited', { count: recap?.editedCount ?? 0 })
            : t(`recap.${section.id}`)}
        </Text>
      </View>
    ),
    [styles.sectionHeader, commonThemedStyles.sectionCamelCase, t, recap?.editedCount],
  )

  const listHeader = useMemo(
    () => (
      <>
        <View onLayout={handleTitleBlockLayout}>
          <Text style={styles.pageTitle} numberOfLines={2}>
            {t('tools.recap')}
          </Text>
        </View>
        <Text style={styles.hint}>{t('recap.hint')}</Text>
      </>
    ),
    [handleTitleBlockLayout, t, styles.pageTitle, styles.hint],
  )

  const listEmpty = useMemo(
    () =>
      empty ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{t('recap.emptyTitle')}</Text>
          <Text style={styles.emptyBody}>{t('recap.emptyBody')}</Text>
        </View>
      ) : null,
    [empty, t, styles.empty, styles.emptyTitle, styles.emptyBody],
  )

  const refreshControl = useMemo(
    () => <RefreshControl refreshing={refreshing} onRefresh={refresh} />,
    [refreshing, refresh],
  )

  return (
    <View style={styles.container}>
      <Stack.Screen options={screenOptions} />
      <SectionList
        sections={sections}
        keyExtractor={(item: RecapRow) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        refreshControl={refreshControl}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        {...scrollProps}
        showsVerticalScrollIndicator={false}
        initialNumToRender={LIST_INITIAL_RENDER_COUNT}
        maxToRenderPerBatch={LIST_BATCH_RENDER_COUNT}
        windowSize={LIST_WINDOW_SIZE}
      />
      <ScreenEdgeFades />
    </View>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      ...commonStyles.flex1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingTop: Space.sm,
      paddingBottom: Space.scrollBottom,
    },
    pageTitle: {
      fontSize: FontSize.hero,
      lineHeight: UI_SIZE_42,
      fontWeight: FontWeight.heavy,
      letterSpacing: LetterSpacing.tight,
      color: theme.colors.text,
      marginLeft: Space.base,
      paddingRight: Space.base,
      marginBottom: Space.sm,
    },
    hint: {
      marginHorizontal: Space.base,
      marginBottom: Space.base,
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
    },
    sectionHeader: {
      marginLeft: Space.base,
      marginTop: Space.base,
    },
    row: {
      paddingVertical: Space.md,
      paddingHorizontal: Space.base,
      gap: Space.xs,
    },
    rowTitle: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
    },
    meta: {
      fontSize: FontSize.caption,
      color: theme.colors.textSecondary,
    },
    divider: {
      marginHorizontal: Space.base,
    },
    empty: {
      alignItems: 'center',
      paddingHorizontal: Space.xxxl,
      paddingTop: Space.huge,
      gap: Space.sm,
    },
    emptyTitle: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
      textAlign: 'center',
    },
    emptyBody: {
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
  })
  return styles
})
