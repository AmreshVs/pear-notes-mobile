import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, RefreshControl, SectionList, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'

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
import { useTitleCollapse } from '@/hooks/useTitleCollapse'
import {
  formatUpcomingDue,
  type UpcomingSection,
  type UpcomingTask,
  upcomingTaskKey,
  useUpcomingTasks,
} from '@/hooks/useUpcomingTasks'
import { useNoteEditor } from '@/providers/NoteEditorContext'

export function UpcomingPane() {
  const { t, i18n } = useTranslation()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const { openNote } = useNoteEditor()
  const { sections, count, loaded, refreshing, refresh } = useUpcomingTasks()
  const { isTitleCollapsed, handleTitleBlockLayout, scrollProps } = useTitleCollapse()

  const headerTitle = useCallback(
    () => (
      <CollapsedNavTitle title={t('upcoming.title')} subtitle={t('upcoming.count', { count })} />
    ),
    [t, count],
  )

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
    ({ item, index, section }: { item: UpcomingTask; index: number; section: UpcomingSection }) => (
      <View>
        <Pressable
          onPress={() => openNote(item.noteKey)}
          style={({ pressed }) => [styles.row, pressed && commonStyles.pressed]}
          accessibilityRole="button"
        >
          <Text style={styles.taskText} numberOfLines={2}>
            {item.text}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {formatUpcomingDue(item, i18n.language)} • {item.title || t('noteCard.untitled')}
          </Text>
        </Pressable>
        {index < section.data.length - 1 && (
          <View style={styles.divider}>
            <Divider />
          </View>
        )}
      </View>
    ),
    [openNote, i18n.language, t, styles.row, styles.taskText, styles.meta, styles.divider],
  )

  const renderSectionHeader = useCallback(
    ({ section }: { section: UpcomingSection }) => (
      <View style={styles.sectionHeader}>
        <Text style={commonThemedStyles.sectionCamelCase}>{section.title}</Text>
      </View>
    ),
    [styles.sectionHeader, commonThemedStyles.sectionCamelCase],
  )

  const listHeader = useMemo(
    () => (
      <>
        <View onLayout={handleTitleBlockLayout}>
          <Text style={styles.pageTitle} numberOfLines={2}>
            {t('upcoming.title')}
          </Text>
          <View style={styles.headerInfo}>
            <Text style={commonThemedStyles.sectionCap} accessibilityLiveRegion="polite">
              {t('upcoming.count', { count })}
            </Text>
          </View>
        </View>
        <Text style={styles.hint}>{t('upcoming.hint')}</Text>
      </>
    ),
    [
      handleTitleBlockLayout,
      t,
      count,
      styles.pageTitle,
      styles.headerInfo,
      styles.hint,
      commonThemedStyles.sectionCap,
    ],
  )

  const listEmpty = useMemo(
    () =>
      loaded ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{t('upcoming.emptyTitle')}</Text>
          <Text style={styles.emptyBody}>{t('upcoming.emptyBody')}</Text>
        </View>
      ) : null,
    [loaded, t, styles.empty, styles.emptyTitle, styles.emptyBody],
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
        keyExtractor={upcomingTaskKey}
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
    },
    headerInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: Space.base,
      marginRight: Space.base,
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
    taskText: {
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
