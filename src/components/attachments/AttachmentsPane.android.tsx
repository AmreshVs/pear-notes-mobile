import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native'

import { formatBytes } from '@pear-notes/core/utils.js'

import { AndroidSettingsAppBar } from '@/components/android/AndroidSettingsAppBar'
import { BottomActionSheet, type SheetAction } from '@/components/android/BottomActionSheet'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import type { AttachmentItem, AttachmentSection } from '@/components/attachments/attachments.types'
import {
  AttachmentSectionView,
  COLLAPSED_PHOTOS,
  PHOTO_GAP,
} from '@/components/attachments/AttachmentSectionView.android'
import { AttachmentsFilters } from '@/components/attachments/AttachmentsFilters.android'
import {
  ATTACHMENT_MENU,
  useAttachmentActions,
} from '@/components/attachments/useAttachmentActions'
import { AttachmentBottomSheet } from '@/components/bottomsheet/AttachmentBottomSheet.android'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_SIZE_8,
  UI_SIZE_16,
  UI_SIZE_40,
  UI_SIZE_48,
} from '@/constants/commonStyles'
import {
  LIST_BATCH_RENDER_COUNT,
  LIST_BATCHING_PERIOD_MS,
  LIST_INITIAL_RENDER_COUNT,
  LIST_WINDOW_SIZE,
} from '@/constants/constants'
import { useAttachmentsView } from '@/hooks/useAttachments'
import { attachmentSectionLabel } from '@/utils/attachmentFormat'

const SCROLL_BOTTOM_PADDING = 120

const sectionKey = (section: AttachmentSection) => section.key || 'unfiled'

export function AttachmentsPane() {
  const { t, i18n } = useTranslation()
  const styles = useStyles()
  const { colors } = useMD3Theme()
  const { width } = useWindowDimensions()
  const view = useAttachmentsView()
  const [menuItem, setMenuItem] = useState<AttachmentItem | null>(null)

  const showError = useCallback(
    () => Alert.alert(t('common.error'), t('attachmentsView.failed')),
    [t],
  )
  const actions = useAttachmentActions(showError)
  const { handleMenu } = actions

  const tileStyle = useMemo(() => {
    const size = (width - UI_SIZE_16 * 2 - PHOTO_GAP * (COLLAPSED_PHOTOS - 1)) / COLLAPSED_PHOTOS
    return { width: Math.floor(size), height: Math.floor(size) }
  }, [width])

  const closeMenu = useCallback(() => setMenuItem(null), [])

  const runMenuAction = useCallback(
    (id: string) => {
      if (menuItem) handleMenu(menuItem, id)
      setMenuItem(null)
    },
    [menuItem, handleMenu],
  )

  const menuActions = useMemo<SheetAction[]>(() => {
    const base: SheetAction[] = [
      {
        icon: 'file-document-outline',
        label: t('attachmentsView.openNote'),
        onPress: () => runMenuAction(ATTACHMENT_MENU.openNote),
        noRightIcon: true,
      },
      {
        icon: 'share-variant-outline',
        label: t('attachmentsView.share'),
        onPress: () => runMenuAction(ATTACHMENT_MENU.share),
        noRightIcon: true,
      },
      {
        icon: 'download-outline',
        label: t('attachmentsView.save'),
        onPress: () => runMenuAction(ATTACHMENT_MENU.save),
        noRightIcon: true,
      },
    ]
    if (!menuItem?.fileName) return base
    return [
      ...base,
      {
        icon: 'content-copy',
        label: t('attachmentsView.copyName'),
        onPress: () => runMenuAction(ATTACHMENT_MENU.copyName),
        noRightIcon: true,
      },
    ]
  }, [t, runMenuAction, menuItem?.fileName])

  const hasItems = !!view.items && view.items.length > 0

  const renderSection = useCallback(
    ({ item: section }: { item: AttachmentSection }) => (
      <AttachmentSectionView
        section={section}
        label={attachmentSectionLabel(section, view.by, view.folderNames, t, i18n.language)}
        expanded={view.expanded.has(section.key)}
        tileStyle={tileStyle}
        onToggle={view.toggleSection}
        onPress={actions.select}
        onLongPress={setMenuItem}
      />
    ),
    [
      view.by,
      view.folderNames,
      view.expanded,
      view.toggleSection,
      t,
      i18n.language,
      tileStyle,
      actions.select,
    ],
  )

  const listHeader = useMemo(
    () => (
      <View>
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
      </View>
    ),
    [
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
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>
          {hasItems ? t('attachmentsView.noResults') : t('attachmentsView.emptyTitle')}
        </Text>
        {!hasItems && <Text style={styles.emptyBody}>{t('attachmentsView.emptyBody')}</Text>}
      </View>
    )
  }, [view.loaded, hasItems, t, styles])

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={view.refreshing}
        onRefresh={view.refresh}
        colors={[colors.primary]}
      />
    ),
    [view.refreshing, view.refresh, colors.primary],
  )

  return (
    <View style={styles.root}>
      <AndroidSettingsAppBar title={t('tools.attachments')} showBack />
      <FlatList
        data={view.grouped.sections}
        keyExtractor={sectionKey}
        renderItem={renderSection}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        refreshControl={refreshControl}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={LIST_INITIAL_RENDER_COUNT}
        maxToRenderPerBatch={LIST_BATCH_RENDER_COUNT}
        windowSize={LIST_WINDOW_SIZE}
        updateCellsBatchingPeriod={LIST_BATCHING_PERIOD_MS}
      />
      <AttachmentBottomSheet
        item={actions.selected}
        progress={actions.progress}
        onClose={actions.closeSheet}
        onPreview={actions.preview}
        onOpenNote={actions.openNoteFor}
        onShare={actions.share}
        onSave={actions.save}
      />
      <BottomActionSheet
        visible={!!menuItem}
        onDismiss={closeMenu}
        title={menuItem?.fileName ?? ''}
        actions={menuActions}
      />
    </View>
  )
}

const useStyles = createThemedStylesheetWithHooks((_theme, md3) => {
  const c = md3.colors
  const styles = StyleSheet.create({
    root: {
      ...commonStyles.flex1,
      backgroundColor: c.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: SCROLL_BOTTOM_PADDING,
    },
    summary: {
      marginHorizontal: UI_SIZE_16,
      marginBottom: UI_SIZE_16,
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurfaceVariant,
    },
    empty: {
      alignItems: 'center',
      paddingHorizontal: UI_SIZE_40,
      paddingTop: UI_SIZE_48,
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
}, useMD3Theme)
