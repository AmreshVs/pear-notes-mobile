import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, FlatList, RefreshControl, StyleSheet, useWindowDimensions } from 'react-native'
import { Stack } from 'expo-router'

import { formatBytes } from '@pear-notes/core/utils.js'

import { AttachmentListItem, PHOTO_GAP } from '@/components/attachments/AttachmentListItem'
import type {
  AttachmentItem,
  AttachmentListRow,
  AttachmentSection,
} from '@/components/attachments/attachments.types'
import { AttachmentsFilters } from '@/components/attachments/AttachmentsFilters'
import {
  ATTACHMENT_MENU,
  useAttachmentActions,
} from '@/components/attachments/useAttachmentActions'
import { CollapsedNavTitle } from '@/components/CollapsedNavTitle'
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
import {
  LIST_BATCH_RENDER_COUNT,
  LIST_INITIAL_RENDER_COUNT,
  LIST_WINDOW_SIZE,
} from '@/constants/constants'
import { HIDDEN_SCROLL_EDGE_EFFECTS } from '@/constants/navigation'
import { useAttachmentsView } from '@/hooks/useAttachments'
import { useTitleCollapse } from '@/hooks/useTitleCollapse'
import { attachmentSectionLabel } from '@/utils/attachmentFormat'
import { PHOTO_COLUMNS } from '@/utils/attachmentRows'

import type { ContextMenuItem } from '../../../modules/expo-context-menu'

const rowKey = (row: AttachmentListRow) => row.key

export function AttachmentsPane() {
  const { t, i18n } = useTranslation()
  const styles = useStyles()
  const { width } = useWindowDimensions()
  const view = useAttachmentsView()
  const { isTitleCollapsed, handleTitleBlockLayout, scrollProps } = useTitleCollapse()

  const showError = useCallback(
    () => Alert.alert(t('common.error'), t('attachmentsView.failed')),
    [t],
  )
  const actions = useAttachmentActions(showError)

  const tileStyle = useMemo(() => {
    const size = (width - Space.base * 2 - PHOTO_GAP * (PHOTO_COLUMNS - 1)) / PHOTO_COLUMNS
    return { width: Math.floor(size), height: Math.floor(size) }
  }, [width])

  const baseMenu = useMemo<ContextMenuItem[]>(
    () => [
      {
        id: ATTACHMENT_MENU.openNote,
        title: t('attachmentsView.openNote'),
        systemImage: 'doc.text',
      },
      {
        id: ATTACHMENT_MENU.share,
        title: t('attachmentsView.share'),
        systemImage: 'square.and.arrow.up',
      },
      {
        id: ATTACHMENT_MENU.save,
        title: t('attachmentsView.save'),
        systemImage: 'square.and.arrow.down',
      },
    ],
    [t],
  )
  const namedMenu = useMemo<ContextMenuItem[]>(
    () => [
      ...baseMenu,
      {
        id: ATTACHMENT_MENU.copyName,
        title: t('attachmentsView.copyName'),
        systemImage: 'doc.on.doc',
      },
    ],
    [baseMenu, t],
  )
  const menuItemsFor = useCallback(
    (item: AttachmentItem) => (item.fileName ? namedMenu : baseMenu),
    [namedMenu, baseMenu],
  )

  const headerTitle = useCallback(() => <CollapsedNavTitle title={t('tools.attachments')} />, [t])
  const screenOptions = useMemo(
    () => ({
      headerTitle: isTitleCollapsed ? headerTitle : '',
      headerLargeTitle: false,
      headerTransparent: true,
      scrollEdgeEffects: HIDDEN_SCROLL_EDGE_EFFECTS,
    }),
    [isTitleCollapsed, headerTitle],
  )

  const hasItems = !!view.items && view.items.length > 0

  const sectionLabel = useCallback(
    (section: AttachmentSection) =>
      attachmentSectionLabel(section, view.by, view.folderNames, t, i18n.language),
    [view.by, view.folderNames, t, i18n.language],
  )

  const renderRow = useCallback(
    ({ item: row }: { item: AttachmentListRow }) => (
      <AttachmentListItem
        row={row}
        opening={actions.opening}
        tileStyle={tileStyle}
        sectionLabel={sectionLabel}
        menuItemsFor={menuItemsFor}
        onToggle={view.toggleSection}
        onPress={actions.preview}
        onMenu={actions.handleMenu}
      />
    ),
    [
      actions.opening,
      tileStyle,
      sectionLabel,
      menuItemsFor,
      view.toggleSection,
      actions.preview,
      actions.handleMenu,
    ],
  )

  const listHeader = useMemo(
    () => (
      <>
        <View onLayout={handleTitleBlockLayout}>
          <Text style={styles.pageTitle} numberOfLines={2}>
            {t('tools.attachments')}
          </Text>
        </View>
        {hasItems && (
          <Text style={styles.summary}>
            {t('attachmentsView.summary', {
              count: view.grouped.total,
              size: formatBytes(view.grouped.bytes),
            })}
          </Text>
        )}
        {hasItems && (
          <AttachmentsFilters
            query={view.query}
            onQueryChange={view.setQuery}
            kind={view.kind}
            onKindChange={view.setKind}
            by={view.by}
            onByChange={view.setBy}
            counts={view.grouped.counts}
          />
        )}
      </>
    ),
    [
      handleTitleBlockLayout,
      styles,
      t,
      hasItems,
      view.grouped,
      view.query,
      view.setQuery,
      view.kind,
      view.setKind,
      view.by,
      view.setBy,
    ],
  )

  const listEmpty = useMemo(() => {
    if (!view.loaded) return null
    const noItems = !hasItems
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>
          {noItems ? t('attachmentsView.emptyTitle') : t('attachmentsView.noResults')}
        </Text>
        {noItems && <Text style={styles.emptyBody}>{t('attachmentsView.emptyBody')}</Text>}
      </View>
    )
  }, [view.loaded, hasItems, t, styles])

  const refreshControl = useMemo(
    () => <RefreshControl refreshing={view.refreshing} onRefresh={view.refresh} />,
    [view.refreshing, view.refresh],
  )

  return (
    <View style={styles.container}>
      <Stack.Screen options={screenOptions} />
      <FlatList
        data={view.rows}
        keyExtractor={rowKey}
        renderItem={renderRow}
        extraData={actions.opening}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        refreshControl={refreshControl}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
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
      marginBottom: Space.xs,
    },
    summary: {
      marginHorizontal: Space.base,
      marginBottom: Space.md,
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      color: theme.colors.textMuted,
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
