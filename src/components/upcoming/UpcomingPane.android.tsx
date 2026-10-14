import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type LayoutChangeEvent,
  Pressable,
  RefreshControl,
  SectionList,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSelector } from 'react-redux'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router } from 'expo-router'

import * as notesSlice from '@pear-notes/core/store/slices/notesSlice.js'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { ReminderSettingsBottomSheet } from '@/components/bottomsheet/ReminderSettingsBottomSheet'
import { EdgeFade } from '@/components/EdgeFade'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
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
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_24,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_40,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import {
  ANDROID_APP_BAR_HEIGHT,
  LIST_BATCH_RENDER_COUNT,
  LIST_BATCHING_PERIOD_MS,
  LIST_INITIAL_RENDER_COUNT,
  LIST_WINDOW_SIZE,
} from '@/constants/constants'
import { useRemindersSetting } from '@/hooks/useReminders'
import {
  type UpcomingSection,
  type UpcomingTask,
  upcomingTaskKey,
  useUpcomingTasks,
} from '@/hooks/useUpcomingTasks'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import { isBirthdaysGroup, isOverdueGroup, showsReminderBell } from '@/utils/upcomingFormat'

const { getListedNoteCount } = notesSlice as unknown as {
  getListedNoteCount: (state: unknown) => number
}

export function UpcomingPane() {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const md3 = useMD3Theme()
  const c = md3.colors
  const insets = useSafeAreaInsets()
  const styles = useStyles()
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
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
  const [headerHeight, setHeaderHeight] = useState(0)

  const status = t('upcoming.subtitle', {
    date: new Date().toLocaleDateString(i18n.language, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }),
    count: noteCount,
  })

  const handleBack = useCallback(() => router.back(), [])
  const handleOpenTask = useCallback(
    (task: UpcomingTask) => router.push(`/note/${task.noteKey}`),
    [],
  )
  const handleOpenBirthdays = useCallback(() => router.push('/birthdays'), [])
  const handleOpenSettings = useCallback(() => setSettingsVisible(true), [])
  const handleCloseSettings = useCallback(() => setSettingsVisible(false), [])

  const handleHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height
    setHeaderHeight((prev) => (prev === 0 ? next : Math.min(prev, next)))
  }, [])

  const listContentStyle = useMemo(
    () => [
      styles.listContent,
      { paddingTop: (headerHeight || insets.top + ANDROID_APP_BAR_HEIGHT) + UI_SIZE_10 },
    ],
    [styles.listContent, headerHeight, insets.top],
  )

  const renderItem = useCallback(
    ({ item, index, section }: { item: UpcomingTask; index: number; section: UpcomingSection }) => {
      const birthdays = isBirthdaysGroup(section.group)
      const last = !birthdays && index === section.data.length - 1
      return (
        <View style={[styles.tile, index === 0 && styles.tileTop, last && styles.tileBottom]}>
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
      styles.tile,
      styles.tileTop,
      styles.tileBottom,
    ],
  )

  const renderSectionFooter = useCallback(
    ({ section }: { section: UpcomingSection }) =>
      isBirthdaysGroup(section.group) ? (
        <View style={[styles.tile, styles.tileBottom, section.data.length === 0 && styles.tileTop]}>
          <UpcomingAllBirthdaysRow count={yearly.length} onPress={handleOpenBirthdays} />
        </View>
      ) : null,
    [yearly.length, handleOpenBirthdays, styles.tile, styles.tileTop, styles.tileBottom],
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
            style={isOverdueGroup(section.group) ? styles.sectionCapOverdue : styles.sectionCap}
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
      styles.sectionCap,
      styles.sectionCapOverdue,
    ],
  )

  const listHeader = useMemo(
    () => (
      <View>
        <Text style={styles.pageTitle} numberOfLines={2}>
          {t('upcoming.title')}
        </Text>
        <Text style={styles.pageCount} accessibilityLiveRegion="polite">
          {status}
        </Text>
        <Text style={styles.hint}>{t('upcoming.hint')}</Text>
        {next && <UpcomingNextCard task={next} language={i18n.language} onOpen={handleOpenTask} />}
      </View>
    ),
    [
      t,
      status,
      next,
      i18n.language,
      handleOpenTask,
      styles.pageTitle,
      styles.pageCount,
      styles.hint,
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
    <View style={styles.root}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.headerOverlay} onLayout={handleHeaderLayout} pointerEvents="box-none">
        <EdgeFade color={c.background} />
        <View style={styles.appBar}>
          <Pressable
            onPress={handleBack}
            android_ripple={ripple}
            style={styles.iconBtn}
            hitSlop={UI_SIZE_8}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <MaterialCommunityIcons name="arrow-left" size={UI_ICON_SIZE_24} color={c.primary} />
          </Pressable>
          <Pressable
            onPress={handleOpenSettings}
            android_ripple={ripple}
            style={remindersOn ? styles.iconBtnActive : styles.iconBtn}
            hitSlop={UI_SIZE_8}
            accessibilityRole="button"
            accessibilityLabel={t('upcoming.reminders.title')}
          >
            <MaterialCommunityIcons
              name={remindersOn ? 'bell' : 'bell-outline'}
              size={UI_ICON_SIZE_24}
              color={remindersOn ? c.primary : c.onSurfaceVariant}
            />
          </Pressable>
        </View>
      </View>

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
        contentContainerStyle={listContentStyle}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={LIST_INITIAL_RENDER_COUNT}
        maxToRenderPerBatch={LIST_BATCH_RENDER_COUNT}
        windowSize={LIST_WINDOW_SIZE}
        updateCellsBatchingPeriod={LIST_BATCHING_PERIOD_MS}
      />

      <View style={styles.bottomFade} pointerEvents="none">
        <EdgeFade color={c.background} placement="bottom" />
      </View>

      <ReminderSettingsBottomSheet visible={settingsVisible} onClose={handleCloseSettings} />
    </View>
  )
}

const useUpcomingHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

type TileColors = ReturnType<typeof useMD3Theme>['colors'] & { surfaceContainerHigh?: string }

const useStyles = createThemedStylesheetWithHooks((_theme, { md3, insets }) => {
  const c = md3.colors as TileColors
  const styles = StyleSheet.create({
    root: {
      ...commonStyles.flex1,
      backgroundColor: c.background,
    },
    listContent: {
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: insets.bottom + 100,
    },
    headerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
    },
    bottomFade: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: insets.bottom + UI_SIZE_20,
      zIndex: 5,
    },
    appBar: {
      ...commonStyles.rowBetween,
      paddingHorizontal: UI_SIZE_8,
      paddingTop: insets.top + UI_SIZE_4,
    },
    iconBtn: {
      overflow: 'hidden',
      padding: UI_SIZE_8,
      borderRadius: UI_SIZE_9999,
    },
    iconBtnActive: {
      overflow: 'hidden',
      padding: UI_SIZE_8,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.3),
    },
    pageTitle: {
      fontSize: FontSize.heading,
      fontWeight: FontWeight.heavy,
      fontFamily: FontFamily.extraBold,
      letterSpacing: -0.5,
      color: c.onSurface,
      paddingRight: UI_SIZE_16,
    },
    pageCount: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.heavy,
      fontFamily: FontFamily.extraBold,
      letterSpacing: 1.2,
      color: c.onSurfaceVariant,
      marginTop: UI_SIZE_4,
    },
    hint: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.medium,
      fontWeight: FontWeight.medium,
      color: c.onSurfaceVariant,
      marginTop: UI_SIZE_8,
      marginBottom: UI_SIZE_12,
    },
    sectionHeader: {
      ...commonStyles.rowBetween,
      alignItems: 'baseline',
      marginTop: UI_SIZE_20,
      marginBottom: UI_SIZE_8,
      paddingHorizontal: UI_SIZE_16,
    },
    sectionCap: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.heavy,
      fontFamily: FontFamily.extraBold,
      color: c.primary,
    },
    sectionCapOverdue: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.heavy,
      fontFamily: FontFamily.extraBold,
      color: c.error,
    },
    sectionNote: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurfaceVariant,
    },
    tile: {
      overflow: 'hidden',
      marginBottom: UI_SIZE_2,
      borderRadius: UI_SIZE_4,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
    },
    tileTop: {
      borderTopLeftRadius: UI_SIZE_24,
      borderTopRightRadius: UI_SIZE_24,
    },
    tileBottom: {
      borderBottomLeftRadius: UI_SIZE_24,
      borderBottomRightRadius: UI_SIZE_24,
    },
    empty: {
      ...commonStyles.centered,
      paddingTop: UI_SIZE_40,
      gap: UI_SIZE_8,
    },
    emptyTitle: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
      textAlign: 'center',
    },
    emptyBody: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      textAlign: 'center',
    },
  })
  return styles
}, useUpcomingHooks)
