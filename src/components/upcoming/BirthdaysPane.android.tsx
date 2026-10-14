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
import { UpcomingBirthdayRow } from '@/components/upcoming/UpcomingBirthdayRow'
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
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_40,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { ANDROID_APP_BAR_HEIGHT } from '@/constants/constants'
import { type UpcomingTask, upcomingTaskKey, useUpcomingTasks } from '@/hooks/useUpcomingTasks'
import { androidRipple } from '@/lib/androidRipple'
import { type BirthdayMonth, birthdaysByMonth } from '@/utils/upcomingFormat'

type TileColors = ReturnType<typeof useMD3Theme>['colors'] & { surfaceContainerHigh?: string }

export function BirthdaysPane() {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const md3 = useMD3Theme()
  const c = md3.colors
  const insets = useSafeAreaInsets()
  const styles = useStyles()
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const { yearly, loaded, refreshing, refresh } = useUpcomingTasks()
  const months = useMemo(() => birthdaysByMonth(yearly, i18n.language), [yearly, i18n.language])
  const [headerHeight, setHeaderHeight] = useState(0)

  const handleBack = useCallback(() => router.back(), [])
  const handleOpenTask = useCallback(
    (task: UpcomingTask) => router.push(`/note/${task.noteKey}`),
    [],
  )

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
    ({ item, index, section }: { item: UpcomingTask; index: number; section: BirthdayMonth }) => (
      <View
        style={[
          styles.tile,
          index === 0 && styles.tileTop,
          index === section.data.length - 1 && styles.tileBottom,
        ]}
      >
        <UpcomingBirthdayRow task={item} language={i18n.language} onOpen={handleOpenTask} />
      </View>
    ),
    [i18n.language, handleOpenTask, styles.tile, styles.tileTop, styles.tileBottom],
  )

  const renderSectionHeader = useCallback(
    ({ section }: { section: BirthdayMonth }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionCap}>{section.title}</Text>
        <Text style={styles.sectionNote}>{section.data.length}</Text>
      </View>
    ),
    [styles.sectionHeader, styles.sectionCap, styles.sectionNote],
  )

  const listHeader = useMemo(
    () => (
      <View>
        <Text style={styles.pageTitle} numberOfLines={2}>
          {t('upcoming.birthdayList.title')}
        </Text>
        {yearly.length > 0 && (
          <Text style={styles.pageCount}>
            {t('upcoming.birthdayList.subtitle', { count: yearly.length })}
          </Text>
        )}
      </View>
    ),
    [t, yearly.length, styles.pageTitle, styles.pageCount],
  )

  const listEmpty = useMemo(
    () =>
      loaded ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{t('upcoming.birthdayList.emptyTitle')}</Text>
          <Text style={styles.emptyBody}>{t('upcoming.birthdayList.emptyBody')}</Text>
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
        sections={months}
        keyExtractor={upcomingTaskKey}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        refreshControl={refreshControl}
        contentContainerStyle={listContentStyle}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.bottomFade} pointerEvents="none">
        <EdgeFade color={c.background} placement="bottom" />
      </View>
    </View>
  )
}

const useBirthdaysHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

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
    sectionNote: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurfaceVariant,
      fontVariant: ['tabular-nums'],
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
}, useBirthdaysHooks)
