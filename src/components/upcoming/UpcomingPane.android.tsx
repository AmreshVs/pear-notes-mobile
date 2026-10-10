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
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router } from 'expo-router'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { EdgeFade } from '@/components/EdgeFade'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_24,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
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
import {
  formatUpcomingDue,
  type UpcomingSection,
  type UpcomingTask,
  upcomingTaskKey,
  useUpcomingTasks,
} from '@/hooks/useUpcomingTasks'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

export function UpcomingPane() {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const md3 = useMD3Theme()
  const c = md3.colors
  const insets = useSafeAreaInsets()
  const styles = useStyles()
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const { sections, count, loaded, refreshing, refresh } = useUpcomingTasks()
  const [headerHeight, setHeaderHeight] = useState(0)

  const handleBack = useCallback(() => router.back(), [])

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
    ({ item, index, section }: { item: UpcomingTask; index: number; section: UpcomingSection }) => (
      <View>
        <Pressable
          onPress={() => router.push(`/note/${item.noteKey}`)}
          android_ripple={ripple}
          style={styles.row}
          accessibilityRole="button"
        >
          <Text style={styles.taskText} numberOfLines={2}>
            {item.text}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {formatUpcomingDue(item, i18n.language)} • {item.title || t('noteCard.untitled')}
          </Text>
        </Pressable>
        {index < section.data.length - 1 && <View style={styles.rowDivider} />}
      </View>
    ),
    [ripple, i18n.language, t, styles.row, styles.taskText, styles.meta, styles.rowDivider],
  )

  const renderSectionHeader = useCallback(
    ({ section }: { section: UpcomingSection }) => (
      <Text style={styles.sectionCap}>{section.title}</Text>
    ),
    [styles.sectionCap],
  )

  const listHeader = useMemo(
    () => (
      <View>
        <Text style={styles.pageTitle} numberOfLines={2}>
          {t('upcoming.title')}
        </Text>
        <Text style={styles.pageCount} accessibilityLiveRegion="polite">
          {t('upcoming.count', { count })}
        </Text>
        <Text style={styles.hint}>{t('upcoming.hint')}</Text>
      </View>
    ),
    [t, count, styles.pageTitle, styles.pageCount, styles.hint],
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
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={upcomingTaskKey}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
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
    </View>
  )
}

const useUpcomingHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks((_theme, { md3, insets }) => {
  const c = md3.colors
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
      ...commonStyles.row,
      paddingHorizontal: UI_SIZE_8,
      paddingTop: insets.top + UI_SIZE_4,
    },
    iconBtn: {
      overflow: 'hidden',
      padding: UI_SIZE_8,
      borderRadius: UI_SIZE_9999,
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
    sectionCap: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.heavy,
      fontFamily: FontFamily.extraBold,
      color: c.onSurface,
      marginTop: UI_SIZE_12,
      marginBottom: UI_SIZE_8,
    },
    row: {
      paddingVertical: UI_SIZE_12,
      gap: UI_SIZE_4,
    },
    taskText: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
    },
    meta: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.medium,
      color: c.onSurfaceVariant,
    },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: hexWithAlpha(c.outlineVariant, 0.2),
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
