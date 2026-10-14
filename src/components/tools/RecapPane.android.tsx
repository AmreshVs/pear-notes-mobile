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

import { isRecapEmpty } from '@pear-notes/core/store/services/recap.js'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { EdgeFade } from '@/components/EdgeFade'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import { RecapWeek } from '@/components/tools/RecapWeek'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_14,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_24,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_18,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_32,
  UI_SIZE_40,
  UI_SIZE_56,
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
  formatRecapDay,
  formatRecapRange,
  type RecapNote,
  type RecapSection,
  recapSections,
  useRecap,
} from '@/hooks/useRecap'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

export function RecapPane() {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const md3 = useMD3Theme()
  const c = md3.colors
  const insets = useSafeAreaInsets()
  const styles = useStyles()
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const { recap, loaded, refreshing, refresh } = useRecap()
  const sections = useMemo(() => recapSections(recap), [recap])
  const empty = loaded && !!recap && isRecapEmpty(recap)
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
    ({ item, index, section }: { item: RecapNote; index: number; section: RecapSection }) => {
      const first = index === 0
      const last = index === section.data.length - 1
      return (
        <View style={[styles.rowCard, first && styles.rowFirst, last && styles.rowLast]}>
          {!first && <View style={styles.rowDivider} />}
          <Pressable
            onPress={() => router.push(`/note/${item.key}`)}
            android_ripple={ripple}
            style={styles.row}
            accessibilityRole="button"
          >
            <View style={styles.rowIcon}>
              <MaterialCommunityIcons
                name="file-document-outline"
                size={UI_ICON_SIZE_16}
                color={c.onSurfaceVariant}
              />
            </View>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.title || t('noteCard.untitled')}
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={UI_ICON_SIZE_20}
              color={c.onSurfaceVariant}
            />
          </Pressable>
        </View>
      )
    },
    [ripple, t, c.onSurfaceVariant, styles],
  )

  const renderSectionHeader = useCallback(
    ({ section }: { section: RecapSection }) =>
      recap ? (
        <Text style={styles.dayLabel}>
          {formatRecapDay(section.start, recap, t, i18n.language)}
        </Text>
      ) : null,
    [recap, t, i18n.language, styles.dayLabel],
  )

  const listHeader = useMemo(
    () => (
      <View>
        {recap && (
          <Text style={styles.range}>
            {t('recap.thisWeek', { range: formatRecapRange(recap, i18n.language) })}
          </Text>
        )}
        <Text style={styles.pageTitle} numberOfLines={2}>
          {t('tools.recap')}
        </Text>
        <View style={styles.privacy}>
          <MaterialCommunityIcons
            name="lock-outline"
            size={UI_ICON_SIZE_14}
            color={c.onSurfaceVariant}
          />
          <Text style={styles.privacyText}>{t('recap.privacy')}</Text>
        </View>
        {recap && !isRecapEmpty(recap) && (
          <>
            <RecapWeek recap={recap} />
            <View style={styles.editedHeader}>
              <Text style={styles.editedTitle}>{t('recap.editedTitle')}</Text>
              <Text style={styles.editedCount}>
                {t('recap.noteCount', { count: recap.editedCount })}
              </Text>
            </View>
          </>
        )}
      </View>
    ),
    [recap, t, i18n.language, c.onSurfaceVariant, styles],
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
        keyExtractor={(item: RecapNote) => item.key}
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

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
}

const useRecapHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks((_theme, { md3, insets }) => {
  const c = md3.colors as ExtendedColors
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
    range: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: c.primary,
      marginBottom: UI_SIZE_4,
    },
    pageTitle: {
      fontSize: FontSize.heading,
      fontWeight: FontWeight.heavy,
      fontFamily: FontFamily.extraBold,
      letterSpacing: -0.5,
      color: c.onSurface,
      paddingRight: UI_SIZE_16,
    },
    privacy: {
      ...commonStyles.row,
      gap: UI_SIZE_8,
      marginTop: UI_SIZE_8,
      marginBottom: UI_SIZE_24,
    },
    privacyText: {
      ...commonStyles.flex1,
      fontSize: FontSize.caption,
      fontFamily: FontFamily.medium,
      color: c.onSurfaceVariant,
    },
    editedHeader: {
      ...commonStyles.rowBetween,
      alignItems: 'baseline',
    },
    editedTitle: {
      fontSize: FontSize.title,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onSurface,
    },
    editedCount: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurfaceVariant,
    },
    dayLabel: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onSurfaceVariant,
      marginTop: UI_SIZE_20,
      marginBottom: UI_SIZE_8,
      marginHorizontal: UI_SIZE_4,
    },
    rowCard: {
      overflow: 'hidden',
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
    },
    rowFirst: {
      borderTopLeftRadius: UI_SIZE_18,
      borderTopRightRadius: UI_SIZE_18,
    },
    rowLast: {
      borderBottomLeftRadius: UI_SIZE_18,
      borderBottomRightRadius: UI_SIZE_18,
    },
    row: {
      ...commonStyles.row,
      gap: UI_SIZE_12,
      minHeight: UI_SIZE_56,
      paddingHorizontal: UI_SIZE_16,
    },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      marginHorizontal: UI_SIZE_16,
      backgroundColor: hexWithAlpha(c.outlineVariant, 0.3),
    },
    rowIcon: {
      ...commonStyles.centered,
      width: UI_SIZE_32,
      height: UI_SIZE_32,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.outlineVariant, 0.2),
    },
    rowTitle: {
      ...commonStyles.flex1,
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurface,
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
}, useRecapHooks)
