import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'
import { router, Stack } from 'expo-router'

import { ALL_NOTES_KEY, DEFAULT_FOLDER_ICON, FOLDER_ERROR } from '@pear-notes/core/constant.js'
import {
  createFolder,
  deleteFolder,
  getFolders,
  setSelectedFolder,
  updateFolder,
} from '@pear-notes/core/store/slices/foldersSlice.js'
import {
  createNote,
  getNoteCountsPerFolder,
  getSelectedNote,
} from '@pear-notes/core/store/slices/notesSlice.js'
import { validateFolderName } from '@pear-notes/core/utils.js'

import { FolderIconBottomSheet } from '@/components/bottomsheet/FolderIconBottomSheet'
import { CollapsedNavTitle } from '@/components/CollapsedNavTitle'
import { FolderRow } from '@/components/FolderRow'
import { ScreenEdgeFades } from '@/components/ScreenEdgeFades'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme, View } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  LetterSpacing,
  Space,
  UI_ICON_SIZE_22,
  UI_SIZE_8,
  UI_SIZE_42,
  UI_SIZE_44,
  UI_SIZE_56,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { useTitleCollapse } from '@/hooks/useTitleCollapse'
import { hapticLight, hapticSuccess, hapticWarning } from '@/lib/haptics'
import { useNoteEditor } from '@/providers/NoteEditorContext'

import { FoldersPaneProps } from './types'

export function FoldersPane({ embedded, selectedFolderId, onSelectFolder }: FoldersPaneProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const { colors } = theme
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const dispatch = useDispatch()
  const insets = useSafeAreaInsets()
  const { openNote } = useNoteEditor()
  const folders = useSelector(getFolders)
  const noteCounts = useSelector(getNoteCountsPerFolder) as Record<string, number>
  const selectedNote = useSelector(getSelectedNote)

  const creatingNoteRef = useRef(false)
  const lastSelectedNoteRef = useRef<string | null>(selectedNote || null)
  const isInitialMount = useRef(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [iconPickerFolderId, setIconPickerFolderId] = useState<string | null>(null)

  const matchesSearch = useCallback(
    (folder: any) =>
      !searchQuery || (folder.name || '').toLowerCase().includes(searchQuery.trim().toLowerCase()),
    [searchQuery],
  )

  const topFolders = useMemo(
    () => folders.filter((f: any) => !f.isTrash).filter(matchesSearch),
    [folders, matchesSearch],
  )
  const archiveFolders = useMemo(
    () => folders.filter((f: any) => f.isTrash).filter(matchesSearch),
    [folders, matchesSearch],
  )

  const handleCreateNote = useCallback(() => {
    hapticLight()
    creatingNoteRef.current = true
    dispatch(createNote({ title: '', note: '' } as any))
  }, [dispatch])

  useEffect(() => {
    if (embedded) return
    if (isInitialMount.current) {
      isInitialMount.current = false
      router.push(`/folder/${ALL_NOTES_KEY}` as any)
    }
  }, [embedded])

  useEffect(() => {
    if (creatingNoteRef.current && selectedNote && selectedNote !== lastSelectedNoteRef.current) {
      creatingNoteRef.current = false
      lastSelectedNoteRef.current = selectedNote
      openNote(selectedNote, { focusTitle: true })
    }
  }, [selectedNote, openNote])

  useEffect(() => {
    if (selectedNote) {
      lastSelectedNoteRef.current = selectedNote
    }
  }, [selectedNote])

  const handleSelectFolder = useCallback(
    (folderId: string) => {
      dispatch(setSelectedFolder(folderId as any))
      if (onSelectFolder) {
        onSelectFolder(folderId)
        return
      }
      router.push(`/folder/${folderId}` as any)
    },
    [dispatch, onSelectFolder],
  )

  const showFolderNameError = useCallback(
    (error: string, name: string) => {
      hapticWarning()
      Alert.alert(
        t('folders.newFolderTitle'),
        error === FOLDER_ERROR.DUPLICATE_NAME
          ? t('folders.errors.duplicateName', { name })
          : t('folders.errors.emptyName'),
      )
    },
    [t],
  )

  const handleCreateFolder = useCallback(() => {
    hapticLight()
    Alert.prompt(
      t('folders.newFolderTitle'),
      undefined,
      [
        { text: t('folders.buttons.cancel'), style: 'cancel' },
        {
          text: t('folders.buttons.create'),
          onPress: (name?: string) => {
            const result = validateFolderName(folders, name)
            if (!result.valid) {
              showFolderNameError(result.error, result.name)
              return
            }
            hapticSuccess()
            dispatch(createFolder({ name: result.name } as any))
          },
        },
      ],
      'plain-text',
      '',
    )
  }, [dispatch, folders, showFolderNameError, t])

  const handleRenameFolder = useCallback(
    (folderId: string, currentName: string) => {
      Alert.prompt(
        t('folders.renameTitle'),
        undefined,
        (newName) => {
          const result = validateFolderName(folders, newName, folderId)
          if (!result.valid) {
            showFolderNameError(result.error, result.name)
            return
          }
          if (result.name === currentName) return
          hapticSuccess()
          dispatch(updateFolder({ id: folderId, name: result.name } as any))
        },
        'plain-text',
        currentName,
      )
    },
    [dispatch, folders, showFolderNameError, t],
  )

  const handleDeleteFolder = useCallback(
    (folderId: string) => {
      Alert.alert(t('folders.deleteTitle'), t('folders.deleteDescription'), [
        { text: t('folders.buttons.cancel'), style: 'cancel' },
        {
          text: t('folders.buttons.delete'),
          style: 'destructive',
          onPress: () => {
            hapticWarning()
            dispatch(deleteFolder(folderId as any))
          },
        },
      ])
    },
    [dispatch, t],
  )

  const iconPickerFolder = useMemo(
    () => folders.find((folder: any) => (folder.id || folder.key) === iconPickerFolderId),
    [folders, iconPickerFolderId],
  )

  const handleChangeFolderIcon = useCallback((folderId: string) => {
    setIconPickerFolderId(folderId)
  }, [])

  const handleCloseIconPicker = useCallback(() => setIconPickerFolderId(null), [])

  const handleSelectFolderIcon = useCallback(
    (icon: string) => {
      if (iconPickerFolderId) {
        hapticSuccess()
        dispatch(updateFolder({ id: iconPickerFolderId, icon } as any))
      }
      setIconPickerFolderId(null)
    },
    [dispatch, iconPickerFolderId],
  )

  const iconBtnStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [styles.iconBtn, pressed && commonStyles.pressed],
    [styles.iconBtn],
  )

  const handleOpenSettings = useCallback(() => {
    router.push('/settings')
  }, [])

  const sidebarHeaderStyle = useMemo(
    () => [styles.sidebarHeader, { paddingTop: insets.top + UI_SIZE_56 }],
    [styles.sidebarHeader, insets.top],
  )

  const headerLeft = useCallback(
    () => (
      <Pressable
        onPress={handleOpenSettings}
        style={iconBtnStyle}
        hitSlop={UI_SIZE_8}
        accessible
        accessibilityRole="button"
        accessibilityLabel={t('folders.a11y.openSettings')}
      >
        <SymbolIcon name="gearshape" size={UI_ICON_SIZE_22} color={colors.text} />
      </Pressable>
    ),
    [iconBtnStyle, handleOpenSettings, colors.text, t],
  )

  const renderFolders = useCallback(
    (foldersToRender: any[], startIndex = 0) =>
      foldersToRender.map((folder: any, index: number) => (
        <FolderRow
          key={folder.id || folder.key}
          id={folder.id || folder.key}
          name={folder.name}
          count={noteCounts[folder.id || folder.key] ?? 0}
          icon={folder.icon}
          isSystem={folder.isSystem}
          animationIndex={startIndex + index}
          selected={(folder.id || folder.key) === selectedFolderId}
          grouped
          isLast={index === foldersToRender.length - 1}
          onPress={handleSelectFolder}
          onRename={folder.isSystem ? undefined : handleRenameFolder}
          onChangeIcon={folder.isSystem ? undefined : handleChangeFolderIcon}
          onDelete={folder.isSystem ? undefined : handleDeleteFolder}
        />
      )),
    [
      noteCounts,
      selectedFolderId,
      handleSelectFolder,
      handleRenameFolder,
      handleChangeFolderIcon,
      handleDeleteFolder,
    ],
  )

  const handleSearchChange = useCallback(
    (event: { nativeEvent: { text: string } }) => setSearchQuery(event.nativeEvent.text),
    [],
  )

  const { isTitleCollapsed, handleTitleBlockLayout, scrollProps } = useTitleCollapse()

  const headerTitle = useCallback(() => <CollapsedNavTitle title={t('folders.title')} />, [t])

  const screenOptions = useMemo(
    () => ({
      headerTitle: isTitleCollapsed ? headerTitle : '',
      headerTransparent: true,
      headerLargeTitle: false,
      headerLeft,
      headerSearchBarOptions: {
        placeholder: t('folders.searchPlaceholder'),
        hideWhenScrolling: false,
        placement: 'automatic' as const,
        allowToolbarIntegration: true,
        textColor: colors.text,
        hintTextColor: colors.textSecondary,
        headerIconColor: colors.textSecondary,
        onChangeText: handleSearchChange,
      },
    }),
    [
      headerLeft,
      handleSearchChange,
      t,
      colors.text,
      colors.textSecondary,
      isTitleCollapsed,
      headerTitle,
    ],
  )

  return (
    <View style={styles.container}>
      {embedded ? (
        <View style={sidebarHeaderStyle}>
          <Pressable
            onPress={handleOpenSettings}
            style={iconBtnStyle}
            hitSlop={UI_SIZE_8}
            accessible
            accessibilityRole="button"
            accessibilityLabel={t('folders.a11y.openSettings')}
          >
            <SymbolIcon name="gearshape" size={UI_ICON_SIZE_22} color={colors.text} />
          </Pressable>
          <Text style={styles.sidebarTitle}>{t('folders.title')}</Text>
          <Pressable
            onPress={handleCreateFolder}
            style={iconBtnStyle}
            hitSlop={UI_SIZE_8}
            accessible
            accessibilityRole="button"
            accessibilityLabel={t('folders.a11y.newFolder')}
          >
            <SymbolIcon name="folder.badge.plus" size={UI_ICON_SIZE_22} color={colors.primary} />
          </Pressable>
        </View>
      ) : (
        <>
          <Stack.Screen options={screenOptions} />
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button
              icon="square.and.pencil"
              accessibilityLabel={t('folders.a11y.newNote')}
              onPress={handleCreateNote}
            />
          </Stack.Toolbar>
          <Stack.Toolbar placement="bottom">
            <Stack.Toolbar.SearchBarSlot />
            <Stack.Toolbar.Spacer />
            <Stack.Toolbar.Button
              icon="folder.badge.plus"
              accessibilityLabel={t('folders.a11y.newFolder')}
              onPress={handleCreateFolder}
            />
          </Stack.Toolbar>
        </>
      )}

      <ScrollView
        contentInsetAdjustmentBehavior={embedded ? 'never' : 'automatic'}
        contentContainerStyle={styles.scrollContent}
        {...scrollProps}
      >
        {!embedded && (
          <View onLayout={handleTitleBlockLayout}>
            <Text style={styles.pageTitle}>{t('folders.title')}</Text>
          </View>
        )}
        {topFolders.length > 0 && (
          <View style={[commonThemedStyles.card, styles.group]}>{renderFolders(topFolders)}</View>
        )}

        {topFolders.length === 0 && archiveFolders.length === 0 && (
          <Text style={styles.emptyText}>{t('folders.noFoldersFound')}</Text>
        )}

        {archiveFolders.length > 0 && (
          <View style={styles.archiveSection}>
            <Text style={[commonThemedStyles.sectionCamelCase, styles.sectionHeaderMargin]}>
              {t('folders.archiveHeader')}
            </Text>
            <View style={[commonThemedStyles.card, styles.group]}>
              {renderFolders(archiveFolders, topFolders.length)}
            </View>
          </View>
        )}
      </ScrollView>

      <ScreenEdgeFades />

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

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      ...commonStyles.flex1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingBottom: Space.scrollBottom,
      paddingHorizontal: 0,
      paddingTop: Space.sm,
    },
    pageTitle: {
      fontSize: FontSize.hero,
      lineHeight: UI_SIZE_42,
      fontWeight: FontWeight.heavy,
      letterSpacing: LetterSpacing.tight,
      color: theme.colors.text,
      marginLeft: Space.base,
      marginBottom: Space.lg,
    },
    group: {
      marginHorizontal: Space.base,
    },
    archiveSection: {
      marginTop: Space.xxl,
    },
    sectionHeaderMargin: {
      marginBottom: Space.sm,
      marginLeft: Space.base,
    },
    emptyText: {
      fontSize: FontSize.body,
      textAlign: 'center',
      marginTop: Space.xl,
      color: theme.colors.textMuted,
    },
    sidebarHeader: {
      ...commonStyles.rowBetween,
      paddingHorizontal: Space.sm,
      paddingBottom: Space.sm,
    },
    sidebarTitle: {
      ...commonStyles.flex1,
      fontSize: FontSize.title,
      fontWeight: FontWeight.heavy,
      letterSpacing: LetterSpacing.tight,
      color: theme.colors.text,
      marginLeft: Space.xs,
    },
    iconBtn: {
      ...commonStyles.centered,
      minWidth: UI_SIZE_44,
      minHeight: UI_SIZE_44,
      padding: Space.sm,
    },
  })
  return styles
})
