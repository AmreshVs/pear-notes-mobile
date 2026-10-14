import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, RefreshControl, SectionList, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'

import { isRecapEmpty } from '@pear-notes/core/store/services/recap.js'

import { CollapsedNavTitle } from '@/components/CollapsedNavTitle'
import { ScreenEdgeFades } from '@/components/ScreenEdgeFades'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme, View } from '@/components/Themed'
import { RecapWeek } from '@/components/tools/RecapWeek'
import {
  commonStyles,
  FontSize,
  FontWeight,
  LetterSpacing,
  Radii,
  Space,
  UI_ICON_SIZE_12,
  UI_ICON_SIZE_14,
  UI_SIZE_32,
  UI_SIZE_42,
  UI_SIZE_56,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import {
  LIST_BATCH_RENDER_COUNT,
  LIST_INITIAL_RENDER_COUNT,
  LIST_WINDOW_SIZE,
} from '@/constants/constants'
import { HIDDEN_SCROLL_EDGE_EFFECTS } from '@/constants/navigation'
import {
  formatRecapDay,
  formatRecapRange,
  type RecapNote,
  type RecapSection,
  recapSections,
  useRecap,
} from '@/hooks/useRecap'
import { useTitleCollapse } from '@/hooks/useTitleCollapse'
import { useNoteEditor } from '@/providers/NoteEditorContext'

export function RecapPane() {
  const { t, i18n } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const { openNote } = useNoteEditor()
  const { recap, loaded, refreshing, refresh } = useRecap()
  const { isTitleCollapsed, handleTitleBlockLayout, scrollProps } = useTitleCollapse()

  const sections = useMemo(() => recapSections(recap), [recap])
  const empty = loaded && !!recap && isRecapEmpty(recap)

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
    ({ item, index, section }: { item: RecapNote; index: number; section: RecapSection }) => {
      const first = index === 0
      const last = index === section.data.length - 1
      return (
        <Pressable
          onPress={() => openNote(item.key)}
          style={({ pressed }) => [
            styles.row,
            first && styles.rowFirst,
            last && styles.rowLast,
            pressed && commonStyles.pressed,
          ]}
          accessibilityRole="button"
        >
          <View style={[styles.rowInner, !first && styles.rowDivider]}>
            <View style={styles.rowIcon}>
              <SymbolIcon name="doc.text" size={UI_ICON_SIZE_14} color={colors.textSecondary} />
            </View>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.title || t('noteCard.untitled')}
            </Text>
            <SymbolIcon
              name="chevron.right"
              size={UI_ICON_SIZE_12}
              color={colors.textMuted}
              weight="semibold"
            />
          </View>
        </Pressable>
      )
    },
    [openNote, t, colors.textSecondary, colors.textMuted, styles],
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
      <>
        {recap && (
          <Text style={styles.range}>
            {t('recap.thisWeek', { range: formatRecapRange(recap, i18n.language) })}
          </Text>
        )}
        <View onLayout={handleTitleBlockLayout}>
          <Text style={styles.pageTitle} numberOfLines={2}>
            {t('tools.recap')}
          </Text>
        </View>
        <View style={styles.privacy}>
          <SymbolIcon name="lock" size={UI_ICON_SIZE_12} color={colors.textMuted} />
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
      </>
    ),
    [recap, handleTitleBlockLayout, t, i18n.language, colors.textMuted, styles],
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
        keyExtractor={(item: RecapNote) => item.key}
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
    range: {
      marginHorizontal: Space.base,
      marginBottom: Space.xs,
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: theme.colors.primary,
    },
    pageTitle: {
      fontSize: FontSize.hero,
      lineHeight: UI_SIZE_42,
      fontWeight: FontWeight.heavy,
      letterSpacing: LetterSpacing.tight,
      color: theme.colors.text,
      marginLeft: Space.base,
      paddingRight: Space.base,
      marginBottom: Space.xs,
    },
    privacy: {
      ...commonStyles.row,
      gap: Space.xs + 2,
      marginHorizontal: Space.base,
      marginBottom: Space.xl,
    },
    privacyText: {
      ...commonStyles.flex1,
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
    },
    editedHeader: {
      ...commonStyles.rowBetween,
      alignItems: 'baseline',
      marginHorizontal: Space.base,
    },
    editedTitle: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
    },
    editedCount: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      color: theme.colors.textMuted,
    },
    dayLabel: {
      marginHorizontal: Space.base + Space.xs,
      marginTop: Space.lg,
      marginBottom: Space.sm,
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      color: theme.colors.textMuted,
    },
    row: {
      marginHorizontal: Space.base,
      paddingHorizontal: Space.md + 2,
      backgroundColor: theme.colors.cardSurface,
    },
    rowFirst: {
      borderTopLeftRadius: Radii.lg + 2,
      borderTopRightRadius: Radii.lg + 2,
      borderCurve: 'continuous',
    },
    rowLast: {
      borderBottomLeftRadius: Radii.lg + 2,
      borderBottomRightRadius: Radii.lg + 2,
      borderCurve: 'continuous',
    },
    rowInner: {
      ...commonStyles.row,
      gap: Space.md,
      minHeight: UI_SIZE_56,
      backgroundColor: 'transparent',
    },
    rowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.separator,
    },
    rowIcon: {
      ...commonStyles.centered,
      width: UI_SIZE_32,
      height: UI_SIZE_32,
      borderRadius: UI_SIZE_9999,
      backgroundColor: theme.colors.separator,
    },
    rowTitle: {
      ...commonStyles.flex1,
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
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
