import { ALL_NOTES_KEY } from '@pear-notes/core/constant.js'
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
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { Href, router, Stack } from 'expo-router'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
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
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'

import { BottomActionSheet } from '@/components/android/BottomActionSheet'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  UI_ICON_SIZE_18,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_22,
  UI_ICON_SIZE_24,
  UI_SIZE_10,
  UI_SIZE_14,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_28,
  UI_SIZE_4,
  UI_SIZE_48,
  UI_SIZE_6,
  UI_SIZE_8,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'
import { useNoteEditor } from '@/providers/NoteEditorContext'

type Folder = {
  id: string
  key?: string
  name: string
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

export default function AndroidFoldersScreen() {
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const theme = useTheme()
  const c = md3.colors as ExtendedColors
  const dispatch = useDispatch()
  const { openNote } = useNoteEditor()
  const styles = useStyles()

  const folders = useSelector(getFolders) as Folder[]
  const noteCounts = useSelector(getNoteCountsPerFolder) as Record<string, number>
  const selectedNote = useSelector(getSelectedNote) as string | null

  const [searchQuery, setSearchQuery] = useState('')
  const [folderSheet, setFolderSheet] = useState<string | null>(null)
  const [renameDialog, setRenameDialog] = useState<{ id: string; name: string } | null>(null)
  const [renameText, setRenameText] = useState('')

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
    if (isInitialMount.current) {
      isInitialMount.current = false
      router.push(`/folder/${ALL_NOTES_KEY}` as Href)
    }
  }, [])

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
      router.push(`/folder/${folderId}` as Href)
    },
    [dispatch],
  )

  const handleCreateFolder = useCallback(() => {
    dispatch(createFolder({ name: t('folders.untitled') }))
  }, [dispatch, t])

  const openRenameDialog = useCallback((id: string, name: string) => {
    setRenameText(name)
    setRenameDialog({ id, name })
  }, [])

  const confirmRename = useCallback(() => {
    if (!renameDialog) return
    const trimmed = renameText.trim()
    if (trimmed && trimmed !== renameDialog.name) {
      dispatch(updateFolder({ id: renameDialog.id, name: trimmed }))
    }
    setRenameDialog(null)
  }, [dispatch, renameDialog, renameText])

  const handleFolderLongPress = useCallback(
    (folderId: string) => {
      const folder = folders.find((f) => f.id === folderId || f.key === folderId)
      if (!folder || folder.isSystem) return
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

  const handleSheetDelete = useCallback(() => {
    if (!folderSheet) return
    const folderId = folderSheet
    setFolderSheet(null)
    Alert.alert(t('folders.deleteTitle'), t('folders.deleteDescription'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('folders.buttons.delete'),
        style: 'destructive',
        onPress: () => dispatch(deleteFolder(folderId)),
      },
    ])
  }, [folderSheet, dispatch, t])

  const handleOpenSettings = useCallback(() => {
    router.push('/settings')
  }, [])

  const handleCloseRenameDialog = useCallback(() => {
    setRenameDialog(null)
  }, [])

  const handleCloseFolderSheet = useCallback(() => {
    setFolderSheet(null)
  }, [])

  const handleNoop = useCallback(() => {}, [])

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
        icon: 'delete-outline',
        label: t('folders.buttons.delete'),
        onPress: handleSheetDelete,
        destructive: true,
      },
    ],
    [handleSheetRename, handleSheetDelete, t],
  )

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={c.background}
      />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={commonStyles.flex1}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeIn.duration(200)} style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>{t('folders.title')}</Text>
            <Text style={styles.pageSubtitle}>{t('folders.subtitle')}</Text>
          </View>
          <Pressable
            onPress={handleOpenSettings}
            style={({ pressed }) => [styles.gearBtn, pressed && styles.gearBtnPressed]}
            hitSlop={UI_SIZE_8}
          >
            <MaterialCommunityIcons name="cog-outline" size={UI_ICON_SIZE_24} color={c.onSurface} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(220).delay(40).easing(Easing.out(Easing.cubic))} style={styles.searchWrap}>
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
              placeholderTextColor={c.onSurfaceVariant + '80'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(240).delay(80).easing(Easing.out(Easing.cubic))}
          layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
          style={styles.listCard}
        >
          {topFolders.map((folder, index) => (
            <VaultFolderRow
              key={folder.id || folder.key}
              id={folder.id || folder.key!}
              name={folder.name}
              isAll={folder.isAll}
              isTrash={folder.isTrash}
              count={noteCounts[folder.id || folder.key!] ?? 0}
              isLast={index === topFolders.length - 1}
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
        </Animated.View>

        {archiveFolders.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(240).delay(120).easing(Easing.out(Easing.cubic))}
            style={styles.archiveSection}
          >
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="archive-outline"
                size={UI_ICON_SIZE_20}
                color={c.onSurfaceVariant}
              />
              <Text style={styles.sectionTitle}>{t('folders.archiveHeader')}</Text>
            </View>
            <View style={styles.listCard}>
              {archiveFolders.map((folder, index) => (
                <VaultFolderRow
                  key={folder.id || folder.key}
                  id={folder.id || folder.key!}
                  name={folder.name}
                  isAll={folder.isAll}
                  isTrash={folder.isTrash}
                  count={noteCounts[folder.id || folder.key!] ?? 0}
                  isLast={index === archiveFolders.length - 1}
                  colors={c}
                  onPress={handleSelectFolder}
                  onLongPress={handleFolderLongPress}
                />
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        onPress={handleCreateFolder}
        style={styles.fab}
        color={c.onPrimaryContainer}
        customSize={64}
        theme={{ colors: { primaryContainer: c.primaryContainer } }}
      />

      <Modal
        visible={!!renameDialog}
        transparent
        animationType="fade"
        onRequestClose={handleCloseRenameDialog}
        statusBarTranslucent
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseRenameDialog}>
          <Pressable style={styles.renameDialog} onPress={handleNoop}>
            <Text style={styles.dialogTitle}>{t('folders.renameTitle')}</Text>
            <PaperTextInput
              value={renameText}
              onChangeText={setRenameText}
              autoFocus
              mode="outlined"
              label={t('folders.renameLabel')}
            />
            <View style={styles.dialogActions}>
              <Pressable onPress={handleCloseRenameDialog} style={styles.dialogBtn}>
                <Text style={styles.dialogBtnTextCancel}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable onPress={confirmRename} style={styles.dialogBtn}>
                <Text style={styles.dialogBtnTextRename}>{t('folders.buttons.rename')}</Text>
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
    </View>
  )
}

type VaultFolderRowProps = {
  id: string
  name: string
  isAll?: boolean
  isTrash?: boolean
  count: number
  isLast: boolean
  colors: ExtendedColors
  onPress: (id: string) => void
  onLongPress: (id: string) => void
}

const VaultFolderRow = memo(function VaultFolderRow({
  id,
  name,
  isAll,
  isTrash,
  count,
  isLast,
  colors: c,
  onPress,
  onLongPress,
}: VaultFolderRowProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePress = useCallback(() => onPress(id), [id, onPress])
  const handleLongPress = useCallback(() => onLongPress(id), [id, onLongPress])
  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.97, { duration: 120, easing: Easing.out(Easing.cubic) })
  }, [scale])
  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) })
  }, [scale])

  const iconName = isAll ? 'folder-account' : isTrash ? 'delete-outline' : 'folder-outline'
  const iconColor = isTrash ? c.error : c.primary
  const countLabel =
    count > 0
      ? t(count === 1 ? 'folderView.noteCount_one' : 'folderView.noteCount_other', { count })
      : null

  const getPressableStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.row,
      !isLast && styles.rowDivider,
      pressed && styles.rowPressed,
    ],
    [isLast, styles],
  )

  return (
    <Animated.View
      style={animatedStyle}
      layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
    >
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={getPressableStyle}
      >
        <View style={styles.rowLeft}>
          <View style={[styles.iconWrap, isTrash ? styles.iconWrapTrash : styles.iconWrapDefault]}>
            <MaterialCommunityIcons name={iconName} size={UI_ICON_SIZE_22} color={iconColor} />
          </View>
          <Text style={styles.rowNameText}>{name}</Text>
        </View>
        <View style={styles.rowRight}>
          {countLabel && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{countLabel}</Text>
            </View>
          )}
          <MaterialCommunityIcons
            name="chevron-right"
            size={UI_ICON_SIZE_18}
            color={hexWithAlpha(c.onSurfaceVariant, 0.5)}
          />
        </View>
      </Pressable>
    </Animated.View>
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
    scrollContent: {
      paddingHorizontal: UI_SIZE_20,
      paddingTop: 52,
      paddingBottom: insets.bottom + 100,
    },
    header: {
      ...commonStyles.row,
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: UI_SIZE_28,
    },
    pageTitle: {
      fontSize: FontSize.hero,
      fontWeight: FontWeight.black,
      fontFamily: FontFamily.extraBold,
      letterSpacing: -0.5,
      color: c.onSurface,
      marginBottom: UI_SIZE_4,
    },
    pageSubtitle: {
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
      fontWeight: FontWeight.regular,
      fontFamily: FontFamily.regular,
    },
    gearBtn: {
      ...commonStyles.headerBtn,
      borderRadius: UI_SIZE_9999,
      marginTop: -4,
    },
    gearBtnPressed: {
      backgroundColor: hexWithAlpha(c.surfaceContainerHighest ?? c.surfaceVariant, 0.5),
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
      borderWidth: StyleSheet.hairlineWidth,
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
      fontSize: FontSize.title,
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
      paddingVertical: 13,
      paddingHorizontal: UI_SIZE_16,
    },
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: hexWithAlpha(c.outlineVariant, 0.2),
    },
    rowPressed: {
      backgroundColor: hexWithAlpha(c.surfaceContainerHighest ?? c.surface, 0.5),
    },
    rowLeft: {
      ...commonStyles.row,
      gap: UI_SIZE_14,
      flex: 1,
    },
    iconWrap: {
      width: UI_SIZE_48,
      height: UI_SIZE_48,
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
    },
    rowRight: {
      ...commonStyles.row,
      gap: UI_SIZE_10,
    },
    countBadge: {
      paddingHorizontal: UI_SIZE_10,
      paddingVertical: UI_SIZE_4,
      borderRadius: UI_SIZE_9999,
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
