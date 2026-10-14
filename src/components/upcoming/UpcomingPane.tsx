import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshControl, SectionList, StyleSheet, View as RNView } from 'react-native'
import { useSelector } from 'react-redux'
import { router, Stack } from 'expo-router'

import * as notesSlice from '@pear-notes/core/store/slices/notesSlice.js'

import { ReminderSettingsBottomSheet } from '@/components/bottomsheet/ReminderSettingsBottomSheet'
import { CollapsedNavTitle } from '@/components/CollapsedNavTitle'
import { Divider } from '@/components/Divider'
import { ScreenEdgeFades } from '@/components/ScreenEdgeFades'
import { createThemedStylesheet, Text, useTheme, View } from '@/components/Themed'
import {
  UpcomingAllBirthdaysRow,
  UpcomingBirthdayRow,
} from '@/components/upcoming/UpcomingBirthdayRow'
import { UpcomingFoldHeader } from '@/components/upcoming/UpcomingFoldHeader'
import { UpcomingNextCard } from '@/components/upcoming/UpcomingNextCard'
import { UpcomingSuggestions } from '@/components/upcoming/UpcomingSuggestions'
import { UpcomingTaskRow } from '@/components/upcoming/UpcomingTaskRow'
import {
  commonStyles,
  FontSize,
  FontWeight,
  LetterSpacing,
  Radii,
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
import { useRemindersSetting } from '@/hooks/useReminders'
import { useTitleCollapse } from '@/hooks/useTitleCollapse'
import {
  type UpcomingSection,
  type UpcomingTask,
  upcomingTaskKey,
  useUpcomingTasks,
} from '@/hooks/useUpcomingTasks'
import { useNoteEditor } from '@/providers/NoteEditorContext'
import { isBirthdaysGroup, isOverdueGroup, showsReminderBell } from '@/utils/upcomingFormat'

const { getListedNoteCount } = notesSlice as unknown as {
  getListedNoteCount: (state: unknown) => number
}

export function UpcomingPane() {
  const { t, i18n } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const { openNote } = useNoteEditor()
  const {
    sections,
    yearly,
    next,
    loaded,
    refreshing,
    refresh,
    toggleDone,
    isPending,
    openFolds,
    toggleFold,
  } = useUpcomingTasks()
  const [remindersOn] = useRemindersSetting()
  const noteCount = useSelector(getListedNoteCount)
  const [settingsVisible, setSettingsVisible] = useState(false)
  const { isTitleCollapsed, handleTitleBlockLayout, scrollProps } = useTitleCollapse()

  const status = t('upcoming.subtitle', {
    date: new Date().toLocaleDateString(i18n.language, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }),
    count: noteCount,
  })

  const handleOpenTask = useCallback((task: UpcomingTask) => openNote(task.noteKey), [openNote])
  const handleOpenBirthdays = useCallback(() => router.push('/birthdays'), [])
  const handleOpenSettings = useCallback(() => setSettingsVisible(true), [])
  const handleCloseSettings = useCallback(() => setSettingsVisible(false), [])

  const headerTitle = useCallback(
    () => <CollapsedNavTitle title={t('upcoming.title')} subtitle={status} />,
    [t, status],
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
    ({ item, index, section }: { item: UpcomingTask; index: number; section: UpcomingSection }) => {
      const birthdays = isBirthdaysGroup(section.group)
      const last = !birthdays && index === section.data.length - 1
      return (
        <View style={[styles.cardRow, index === 0 && styles.cardTop, last && styles.cardBottom]}>
          {index > 0 && (
            <RNView style={styles.divider}>
              <Divider />
            </RNView>
          )}
          {birthdays ? (
            <UpcomingBirthdayRow task={item} language={i18n.language} onOpen={handleOpenTask} />
          ) : (
            <UpcomingTaskRow
              task={item}
              language={i18n.language}
              remind={showsReminderBell(item, section.group, remindersOn)}
              pending={isPending(item)}
              onOpen={handleOpenTask}
              onToggleDone={toggleDone}
            />
          )}
        </View>
      )
    },
    [
      i18n.language,
      remindersOn,
      isPending,
      handleOpenTask,
      toggleDone,
      styles.cardRow,
      styles.cardTop,
      styles.cardBottom,
      styles.divider,
    ],
  )

  const renderSectionFooter = useCallback(
    ({ section }: { section: UpcomingSection }) =>
      isBirthdaysGroup(section.group) ? (
        <View
          style={[styles.cardRow, styles.cardBottom, section.data.length === 0 && styles.cardTop]}
        >
          {section.data.length > 0 && (
            <RNView style={styles.divider}>
              <Divider />
            </RNView>
          )}
          <UpcomingAllBirthdaysRow count={yearly.length} onPress={handleOpenBirthdays} />
        </View>
      ) : null,
    [
      yearly.length,
      handleOpenBirthdays,
      styles.cardRow,
      styles.cardTop,
      styles.cardBottom,
      styles.divider,
    ],
  )

  const renderSectionHeader = useCallback(
    ({ section }: { section: UpcomingSection }) =>
      section.folded ? (
        <UpcomingFoldHeader
          group={section.group}
          title={section.title}
          expanded={openFolds.has(section.group)}
          onToggle={toggleFold}
        />
      ) : (
        <View style={styles.sectionHeader}>
          <Text
            style={[
              commonThemedStyles.sectionCamelCase,
              isOverdueGroup(section.group) && styles.overdueHeader,
            ]}
          >
            {section.title}
          </Text>
          {isBirthdaysGroup(section.group) && (
            <Text style={styles.sectionNote}>{t('upcoming.next30Days')}</Text>
          )}
        </View>
      ),
    [
      openFolds,
      toggleFold,
      t,
      styles.sectionHeader,
      styles.sectionNote,
      styles.overdueHeader,
      commonThemedStyles.sectionCamelCase,
    ],
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
              {status}
            </Text>
          </View>
        </View>
        <Text style={styles.hint}>{t('upcoming.hint')}</Text>
        {next && <UpcomingNextCard task={next} language={i18n.language} onOpen={handleOpenTask} />}
      </>
    ),
    [
      handleTitleBlockLayout,
      t,
      status,
      next,
      i18n.language,
      handleOpenTask,
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
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={remindersOn ? 'bell.fill' : 'bell'}
          tintColor={remindersOn ? colors.primary : undefined}
          accessibilityLabel={t('upcoming.reminders.title')}
          onPress={handleOpenSettings}
        />
      </Stack.Toolbar>
      <SectionList
        sections={sections}
        keyExtractor={upcomingTaskKey}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        renderSectionFooter={renderSectionFooter}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={UpcomingSuggestions}
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
      <ReminderSettingsBottomSheet visible={settingsVisible} onClose={handleCloseSettings} />
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
      ...commonStyles.rowBetween,
      alignItems: 'baseline',
      marginHorizontal: Space.base,
      marginTop: Space.lg,
    },
    sectionNote: {
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
    },
    cardRow: {
      marginHorizontal: Space.base,
      backgroundColor: theme.colors.cardSurface,
    },
    cardTop: {
      borderTopLeftRadius: Radii.card,
      borderTopRightRadius: Radii.card,
      borderCurve: 'continuous',
    },
    cardBottom: {
      borderBottomLeftRadius: Radii.card,
      borderBottomRightRadius: Radii.card,
      borderCurve: 'continuous',
    },
    overdueHeader: {
      color: theme.colors.error,
    },
    divider: {
      marginLeft: Space.base,
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
