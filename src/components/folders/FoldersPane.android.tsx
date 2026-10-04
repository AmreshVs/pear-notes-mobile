import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import { FAB, TextInput as PaperTextInput } from 'react-native-paper'
import { Easing, LinearTransition } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { Href, router, Stack } from 'expo-router'

import {
  ALL_NOTES_KEY,
  DEFAULT_FOLDER_ICON,
  FOLDER_ERROR,
  FOLDER_NAME_MAX_LENGTH,
  SEARCH_QUERY_MAX_LENGTH,
} from '@pear-notes/core/constant.js'
import {
  createFolder,
  deleteFolder,
  getFolders,
  setSelectedFolder,
  updateFolder,
} from '@pear-notes/core/store/slices/foldersSlice.js'
import {
  getNoteCountsPerFolder,
  getSelectedNote,
} from '@pear-notes/core/store/slices/notesSlice.js'
import { validateFolderName } from '@pear-notes/core/utils.js'

import { BottomActionSheet } from '@/components/android/BottomActionSheet'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { FolderIconBottomSheet } from '@/components/bottomsheet/FolderIconBottomSheet'
import { EdgeFade } from '@/components/EdgeFade'
import { VaultTitle } from '@/components/folders/VaultTitle'
import { MotionView } from '@/components/MotionView'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  UI_ICON_SIZE_18,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_24,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_36,
  UI_SIZE_48,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { FALLBACK_FOLDER_MATERIAL, FOLDER_ICON_MATERIAL } from '@/constants/folderIcons'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import { hapticLight, hapticMedium, hapticSuccess, hapticWarning } from '@/lib/haptics'
import { useNoteEditor } from '@/providers/NoteEditorContext'
import { MAX_FONT_SCALE_CHROME } from '@/utils/dynamicType'

import { FoldersPaneProps } from './types'

type Folder = {
  id: string
  key?: string
  name: string
  icon?: string
  isAll?: boolean
  isTrash?: boolean
  isSystem?: boolean
}

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerLow: string
  surfaceContainer: string
  surfaceContainerHigh: string
  surfaceContainerHighest: string
  surfaceContainerLowest: string
  surfaceTint: string
}

export function FoldersPane({ embedded, selectedFolderId, onSelectFolder }: FoldersPaneProps) {
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const theme = useTheme()
  const c = md3.colors as ExtendedColors
  const screenRipple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const screenRippleBorderless = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const dispatch = useDispatch()
  const { openNote } = useNoteEditor()
  const styles = useStyles()

  const folders = useSelector(getFolders) as Folder[]
  const noteCounts = useSelector(getNoteCountsPerFolder) as Record<string, number>
  const selectedNote = useSelector(getSelectedNote) as string | null

  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirmFolder, setDeleteConfirmFolder] = useState<string | null>(null)
  const [folderSheet, setFolderSheet] = useState<string | null>(null)
  const [iconPickerFolderId, setIconPickerFolderId] = useState<string | null>(null)
  const [folderDialog, setFolderDialog] = useState<{ id: string; name: string } | null>(null)
  const [renameText, setRenameText] = useState('')
  const [folderError, setFolderError] = useState<string | null>(null)

  const creatingNoteRef = useRef(false)
  const lastSelectedNoteRef = useRef<string | null>(selectedNote)
  const isInitialMount = useRef(true)

  const topFolders = useMemo(
    () =>
      folders
        .filter((f) => !f.isTrash)
        .filter((f) => !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [folders, searchQuery],
  )

  const archiveFolders = useMemo(
    () =>
      folders
        .filter((f) => f.isTrash)
        .filter((f) => !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [folders, searchQuery],
  )

  useEffect(() => {
    if (embedded) return
    if (isInitialMount.current) {
      isInitialMount.current = false
      router.push(`/folder/${ALL_NOTES_KEY}` as Href)
    }
  }, [embedded])

  useEffect(() => {
    if (creatingNoteRef.current && selectedNote && selectedNote !== lastSelectedNoteRef.current) {
      creatingNoteRef.current = false
      lastSelectedNoteRef.current = selectedNote
      openNote(selectedNote)
    }
  }, [selectedNote, openNote])

  useEffect(() => {
    if (selectedNote) lastSelectedNoteRef.current = selectedNote
  }, [selectedNote])

  const handleSelectFolder = useCallback(
    (folderId: string) => {
      dispatch(setSelectedFolder(folderId))
      if (onSelectFolder) {
        onSelectFolder(folderId)
        return
      }
      router.push(`/folder/${folderId}` as Href)
    },
    [dispatch, onSelectFolder],
  )

  const handleCreateFolder = useCallback(() => {
    hapticLight()
    setRenameText('')
    setFolderError(null)
    setFolderDialog({ id: '', name: '' })
  }, [])

  const openRenameDialog = useCallback((id: string, name: string) => {
    setRenameText(name)
    setFolderError(null)
    setFolderDialog({ id, name })
  }, [])

  const handleChangeFolderName = useCallback((value: string) => {
    setRenameText(value)
    setFolderError(null)
  }, [])

  const confirmFolderDialog = useCallback(() => {
    if (!folderDialog) return
    const result = validateFolderName(folders, renameText, folderDialog.id || null)
    if (!result.valid) {
      hapticWarning()
      setFolderError(
        result.error === FOLDER_ERROR.DUPLICATE_NAME
          ? t('folders.errors.duplicateName', { name: result.name })
          : t('folders.errors.emptyName'),
      )
      return
    }
    if (!folderDialog.id) {
      hapticSuccess()
      dispatch(createFolder({ name: result.name } as any))
    } else if (result.name !== folderDialog.name) {
      hapticSuccess()
      dispatch(updateFolder({ id: folderDialog.id, name: result.name } as any))
    }
    setFolderDialog(null)
  }, [dispatch, folderDialog, folders, renameText, t])

  const handleFolderLongPress = useCallback(
    (folderId: string) => {
      const folder = folders.find((f) => f.id === folderId || f.key === folderId)
      if (!folder || folder.isSystem) return
      hapticMedium()
      setFolderSheet(folderId)
    },
    [folders],
  )

  const handleSheetRename = useCallback(() => {
    if (!folderSheet) return
    const folder = folders.find((f) => f.id === folderSheet || f.key === folderSheet)
    if (!folder) return
    setFolderSheet(null)
    openRenameDialog(folderSheet, folder.name)
  }, [folderSheet, folders, openRenameDialog])

  const iconPickerFolder = useMemo(
    () => folders.find((f) => f.id === iconPickerFolderId || f.key === iconPickerFolderId),
    [folders, iconPickerFolderId],
  )

  const handleSheetChangeIcon = useCallback(() => {
    if (!folderSheet) return
    setIconPickerFolderId(folderSheet)
    setFolderSheet(null)
  }, [folderSheet])

  const handleCloseIconPicker = useCallback(() => setIconPickerFolderId(null), [])

  const handleSelectFolderIcon = useCallback(
    (icon: string) => {
      if (iconPickerFolderId) {
        dispatch(updateFolder({ id: iconPickerFolderId, icon } as any))
      }
      setIconPickerFolderId(null)
    },
    [dispatch, iconPickerFolderId],
  )

  const handleSheetDelete = useCallback(() => {
    if (!folderSheet) return
    const folderId = folderSheet
    setFolderSheet(null)
    setDeleteConfirmFolder(folderId)
  }, [folderSheet])

  const handleConfirmDelete = useCallback(() => {
    if (!deleteConfirmFolder) return
    hapticWarning()
    dispatch(deleteFolder(deleteConfirmFolder as any))
    setDeleteConfirmFolder(null)
  }, [deleteConfirmFolder, dispatch])

  const handleCloseDeleteConfirm = useCallback(() => {
    setDeleteConfirmFolder(null)
  }, [])

  const handleOpenSettings = useCallback(() => {
    router.push('/settings')
  }, [])

  const handleCloseFolderDialog = useCallback(() => {
    setFolderDialog(null)
    setFolderError(null)
  }, [])

  const handleCloseFolderSheet = useCallback(() => {
    setFolderSheet(null)
  }, [])

  const handleNoop = useCallback(() => {}, [])

  const isCreatingFolder = !!folderDialog && !folderDialog.id

  const sheetTitle = useMemo(() => {
    if (!folderSheet) return t('folders.untitled')
    const folder = folders.find((f) => f.id === folderSheet || f.key === folderSheet)
    return folder?.name ?? t('folders.untitled')
  }, [folders, folderSheet, t])

  const sheetActions = useMemo(
    () => [
      {
        icon: 'pencil-outline',
        label: t('folders.buttons.rename'),
        onPress: handleSheetRename,
      },
      {
        icon: 'view-grid-outline',
        label: t('folders.buttons.changeIcon'),
        onPress: handleSheetChangeIcon,
      },
      {
        icon: 'delete-outline',
        label: t('folders.buttons.delete'),
        onPress: handleSheetDelete,
        destructive: true,
      },
    ],
    [handleSheetRename, handleSheetChangeIcon, handleSheetDelete, t],
  )

  const deleteConfirmActions = useMemo(
    () => [
      {
        icon: 'delete-outline',
        label: t('folders.buttons.delete'),
        onPress: handleConfirmDelete,
        destructive: true,
      },
    ],
    [handleConfirmDelete, t],
  )

  const headerActions = (
    <View style={styles.headerActions}>
      {embedded && (
        <Pressable
          onPress={handleCreateFolder}
          android_ripple={screenRippleBorderless}
          style={styles.gearBtn}
          hitSlop={UI_SIZE_8}
          accessibilityRole="button"
          accessibilityLabel={t('folders.a11y.newFolder')}
        >
          <MaterialCommunityIcons
            name="folder-plus-outline"
            size={UI_ICON_SIZE_24}
            color={c.onSurface}
          />
        </Pressable>
      )}
      <Pressable
        onPress={handleOpenSettings}
        android_ripple={screenRippleBorderless}
        style={styles.gearBtn}
        hitSlop={UI_SIZE_8}
        accessibilityRole="button"
        accessibilityLabel={t('folders.a11y.openSettings')}
      >
        <MaterialCommunityIcons name="cog-outline" size={UI_ICON_SIZE_24} color={c.onSurface} />
      </Pressable>
    </View>
  )

  return (
    <View style={styles.root}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={commonStyles.flex1}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <VaultTitle title={t('folders.title')} titleStyle={styles.pageTitle} />
          {headerActions}
        </View>

        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <MaterialCommunityIcons
              name="magnify"
              size={UI_ICON_SIZE_20}
              color={c.onSurfaceVariant}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={t('folders.searchPlaceholder')}
              placeholderTextColor={c.onSurfaceVariant}
              accessibilityLabel={t('folders.searchPlaceholder')}
              value={searchQuery}
              onChangeText={setSearchQuery}
              maxLength={SEARCH_QUERY_MAX_LENGTH}
              returnKeyType="search"
            />
          </View>
        </View>

        <MotionView
          layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
          style={styles.listCard}
        >
          {topFolders.map((folder, index) => (
            <VaultFolderRow
              key={folder.id || folder.key}
              id={folder.id || folder.key!}
              name={folder.name}
              icon={folder.icon}
              isAll={folder.isAll}
              isTrash={folder.isTrash}
              count={noteCounts[folder.id || folder.key!] ?? 0}
              isLast={index === topFolders.length - 1}
              selected={(folder.id || folder.key) === selectedFolderId}
              colors={c}
              onPress={handleSelectFolder}
              onLongPress={handleFolderLongPress}
            />
          ))}

          {topFolders.length === 0 && (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>{t('folders.noFoldersFound')}</Text>
            </View>
          )}
        </MotionView>

        {archiveFolders.length > 0 && (
          <View style={styles.archiveSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('folders.archiveHeader')}</Text>
            </View>
            <View style={styles.listCard}>
              {archiveFolders.map((folder, index) => (
                <VaultFolderRow
                  key={folder.id || folder.key}
                  id={folder.id || folder.key!}
                  name={folder.name}
                  icon={folder.icon}
                  isAll={folder.isAll}
                  isTrash={folder.isTrash}
                  count={noteCounts[folder.id || folder.key!] ?? 0}
                  isLast={index === archiveFolders.length - 1}
                  selected={(folder.id || folder.key) === selectedFolderId}
                  colors={c}
                  onPress={handleSelectFolder}
                  onLongPress={handleFolderLongPress}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.topFade} pointerEvents="none">
        <EdgeFade color={c.background} />
      </View>

      <View style={styles.bottomFade} pointerEvents="none">
        <EdgeFade color={c.background} placement="bottom" />
      </View>

      {!embedded && (
        <FAB
          icon="plus"
          onPress={handleCreateFolder}
          style={styles.fab}
          color={c.onPrimaryContainer}
          customSize={64}
          theme={{ colors: { primaryContainer: c.primaryContainer } }}
        />
      )}

      <Modal
        visible={!!folderDialog}
        transparent
        animationType="fade"
        onRequestClose={handleCloseFolderDialog}
        statusBarTranslucent
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseFolderDialog}>
          <Pressable style={styles.renameDialog} onPress={handleNoop}>
            <Text style={styles.dialogTitle}>
              {isCreatingFolder ? t('folders.newFolderTitle') : t('folders.renameTitle')}
            </Text>
            <PaperTextInput
              value={renameText}
              onChangeText={handleChangeFolderName}
              onSubmitEditing={confirmFolderDialog}
              autoFocus
              mode="outlined"
              error={!!folderError}
              maxLength={FOLDER_NAME_MAX_LENGTH}
              label={isCreatingFolder ? t('folders.newFolderLabel') : t('folders.renameLabel')}
            />
            {!!folderError && <Text style={styles.dialogError}>{folderError}</Text>}
            <View style={styles.dialogActions}>
              <Pressable
                onPress={handleCloseFolderDialog}
                android_ripple={screenRipple}
                style={styles.dialogBtn}
              >
                <Text style={styles.dialogBtnTextCancel}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={confirmFolderDialog}
                android_ripple={screenRipple}
                style={styles.dialogBtn}
              >
                <Text style={styles.dialogBtnTextRename}>
                  {isCreatingFolder ? t('folders.buttons.create') : t('folders.buttons.rename')}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <BottomActionSheet
        visible={!!folderSheet}
        onDismiss={handleCloseFolderSheet}
        title={sheetTitle}
        subtitle={t('folders.options')}
        actions={sheetActions}
      />

      <BottomActionSheet
        visible={!!deleteConfirmFolder}
        onDismiss={handleCloseDeleteConfirm}
        title={t('folders.deleteTitle')}
        subtitle={t('folders.deleteDescription')}
        showHeader
        actions={deleteConfirmActions}
      />

      <FolderIconBottomSheet
        visible={!!iconPickerFolder}
        folderName={iconPickerFolder?.name ?? ''}
        selectedIcon={iconPickerFolder?.icon ?? DEFAULT_FOLDER_ICON}
        onSelect={handleSelectFolderIcon}
        onCancel={handleCloseIconPicker}
      />
    </View>
  )
}

type VaultFolderRowProps = {
  id: string
  name: string
  icon?: string
  isAll?: boolean
  isTrash?: boolean
  count: number
  isLast: boolean
  selected?: boolean
  colors: ExtendedColors
  onPress: (id: string) => void
  onLongPress: (id: string) => void
}

const VaultFolderRow = memo(function VaultFolderRow({
  id,
  name,
  icon,
  isAll,
  isTrash,
  count,
  isLast,
  selected,
  colors: c,
  onPress,
  onLongPress,
}: VaultFolderRowProps) {
  const styles = useStyles()
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])

  const handlePress = useCallback(() => onPress(id), [id, onPress])
  const handleLongPress = useCallback(() => onLongPress(id), [id, onLongPress])

  const iconName = FOLDER_ICON_MATERIAL[icon ?? ''] ?? FALLBACK_FOLDER_MATERIAL
  const iconColor = isTrash ? c.error : c.primary

  return (
    <MotionView layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}>
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        android_ripple={ripple}
        style={[styles.row, selected && styles.rowSelected]}
      >
        <View style={styles.rowLeft}>
          <View style={[styles.iconWrap, isTrash ? styles.iconWrapTrash : styles.iconWrapDefault]}>
            <MaterialCommunityIcons
              name={iconName as never}
              size={UI_ICON_SIZE_20}
              color={iconColor}
            />
          </View>
          <Text style={styles.rowNameText} numberOfLines={1} ellipsizeMode="tail">
            {name}
          </Text>
        </View>
        <View style={styles.rowRight}>
          {count > 0 && (
            <View style={styles.countBadge}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE_CHROME} style={styles.countText}>
                {count}
              </Text>
            </View>
          )}
          <MaterialCommunityIcons
            name="chevron-right"
            size={UI_ICON_SIZE_18}
            color={c.onSurfaceVariant}
          />
        </View>
      </Pressable>
      {!isLast && (
        <View style={styles.dividerWrap}>
          <View style={styles.rowDivider} />
        </View>
      )}
    </MotionView>
  )
})

const useFolderHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  const dims = useWindowDimensions()
  return { md3, insets, dims }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3, insets, dims }) => {
  const c = md3.colors as ExtendedColors
  const isDark = theme.isDark
  const styles = StyleSheet.create({
    root: {
      ...commonStyles.flex1,
      backgroundColor: c.background,
    },
    topFade: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: insets.top + UI_SIZE_20,
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
    scrollContent: {
      paddingHorizontal: UI_SIZE_20,
      paddingTop: insets.top + UI_SIZE_24,
      paddingBottom: insets.bottom + 100,
    },
    headerActions: {
      ...commonStyles.row,
    },
    header: {
      ...commonStyles.row,
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: UI_SIZE_12,
    },
    pageTitle: {
      fontSize: FontSize.hero,
      fontWeight: FontWeight.black,
      fontFamily: FontFamily.extraBold,
      letterSpacing: -0.5,
      color: c.onSurface,
      marginBottom: UI_SIZE_4,
    },
    gearBtn: {
      overflow: 'hidden',
      ...commonStyles.headerBtn,
      borderRadius: UI_SIZE_9999,
      marginTop: -4,
    },
    searchWrap: {
      marginBottom: UI_SIZE_16,
    },
    searchBar: {
      ...commonStyles.row,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_9999,
      paddingHorizontal: UI_SIZE_20,
      paddingVertical: 14,
      borderColor: hexWithAlpha(c.outlineVariant, 0.3),
    },
    searchIcon: {
      marginRight: UI_SIZE_10,
    },
    searchInput: {
      flex: 1,
      fontSize: FontSize.subtitle,
      color: c.onSurface,
      fontFamily: FontFamily.medium,
      padding: 0,
    },
    listCard: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: Radii.xl,
      overflow: 'hidden',
    },
    emptyRow: {
      paddingVertical: UI_SIZE_20,
      ...commonStyles.centered,
    },
    emptyText: {
      color: c.onSurfaceVariant,
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
    },
    archiveSection: {
      marginTop: UI_SIZE_48,
    },
    sectionHeader: {
      ...commonStyles.row,
      gap: UI_SIZE_10,
      marginBottom: UI_SIZE_10,
      paddingHorizontal: UI_SIZE_6,
    },
    sectionTitle: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
    },
    fab: {
      position: 'absolute',
      right: UI_SIZE_24,
      backgroundColor: c.primaryContainer,
      borderRadius: UI_SIZE_9999,
      bottom: insets.bottom + 24,
    },
    modalOverlay: {
      ...commonStyles.flex1,
      backgroundColor: theme.colors.backdrop,
      ...commonStyles.centered,
    },
    renameDialog: {
      backgroundColor: c.surfaceContainerHighest ?? c.surface,
      borderRadius: Radii.xl,
      padding: UI_SIZE_24,
      width: Math.min(dims.width - 48, 400),
      elevation: 6,
      shadowColor: theme.colors.black,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    },
    dialogTitle: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      marginBottom: UI_SIZE_16,
      color: c.onSurface,
    },
    dialogError: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      marginTop: UI_SIZE_6,
      color: c.error,
    },
    dialogActions: {
      ...commonStyles.row,
      justifyContent: 'flex-end',
      marginTop: UI_SIZE_16,
      gap: UI_SIZE_4,
    },
    dialogBtn: {
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_10,
    },
    dialogBtnTextCancel: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurfaceVariant,
    },
    dialogBtnTextRename: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.primary,
    },
    row: {
      ...commonStyles.rowBetween,
      padding: UI_SIZE_16,
    },
    rowSelected: {
      backgroundColor: c.secondaryContainer,
    },
    dividerWrap: {
      marginHorizontal: UI_SIZE_16,
    },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: hexWithAlpha(c.outlineVariant, 0.2),
    },
    rowLeft: {
      ...commonStyles.row,
      gap: UI_SIZE_14,
      flex: 1,
      minWidth: 0,
    },
    iconWrap: {
      width: UI_SIZE_36,
      height: UI_SIZE_36,
      borderRadius: UI_SIZE_9999,
      ...commonStyles.centered,
    },
    iconWrapDefault: {
      backgroundColor: hexWithAlpha(c.primaryContainer, isDark ? 0.18 : 0.22),
    },
    iconWrapTrash: {
      backgroundColor: hexWithAlpha(c.errorContainer ?? '#871c34', isDark ? 0.18 : 0.22),
    },
    rowNameText: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
      flex: 1,
      paddingRight: UI_SIZE_4,
    },
    rowRight: {
      ...commonStyles.row,
      gap: UI_SIZE_10,
      flexShrink: 0,
    },
    countBadge: {
      flexShrink: 0,
      width: UI_SIZE_24,
      height: UI_SIZE_24,
      borderRadius: UI_SIZE_9999,
      ...commonStyles.centered,
      backgroundColor: hexWithAlpha(c.surfaceContainerHighest ?? c.surfaceVariant, 0.8),
    },
    countText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurfaceVariant,
    },
  })
  return styles
}, useFolderHooks)
