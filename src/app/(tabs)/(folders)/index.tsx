import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { router, Stack } from 'expo-router'

import { ALL_NOTES_KEY, FOLDER_ERROR } from '@pear-notes/core/constant.js'
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

import { FolderRow } from '@/components/FolderRow'
import { GlassView } from '@/components/GlassView'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme, View } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  LetterSpacing,
  Space,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_22,
  UI_SIZE_8,
  UI_SIZE_42,
  UI_SIZE_44,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { hapticLight, hapticSuccess, hapticWarning } from '@/lib/haptics'
import { useNoteEditor } from '@/providers/NoteEditorContext'

export default function FoldersScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { colors } = theme
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const dispatch = useDispatch()
  const { openNote } = useNoteEditor()
  const folders = useSelector(getFolders)
  const noteCounts = useSelector(getNoteCountsPerFolder) as Record<string, number>
  const selectedNote = useSelector(getSelectedNote)

  const creatingNoteRef = useRef(false)
  const lastSelectedNoteRef = useRef<string | null>(selectedNote || null)
  const isInitialMount = useRef(true)

  const [searchQuery, setSearchQuery] = useState('')

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
    if (isInitialMount.current) {
      isInitialMount.current = false
      router.push(`/folder/${ALL_NOTES_KEY}` as any)
    }
  }, [])

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
      router.push(`/folder/${folderId}` as any)
    },
    [dispatch],
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

  const getFolderIcon = useCallback((folder: any) => {
    if (folder.isAll) return 'All'
    if (folder.isTrash) return 'Trash'
    return 'Folder'
  }, [])

  const iconBtnStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [styles.iconBtn, pressed && commonStyles.pressed],
    [styles.iconBtn],
  )

  const handleOpenSettings = useCallback(() => {
    router.push('/settings')
  }, [])

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

  const headerRight = useCallback(
    () => (
      <GlassView intensity={20} borderRadius={24} style={styles.headerPill}>
        <Pressable
          onPress={handleCreateFolder}
          style={iconBtnStyle}
          hitSlop={UI_SIZE_8}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t('folders.a11y.newFolder')}
        >
          <SymbolIcon name="folder.badge.plus" size={UI_ICON_SIZE_20} color={colors.text} />
        </Pressable>
        <View style={commonThemedStyles.pillDivider} />
        <Pressable
          onPress={handleCreateNote}
          style={iconBtnStyle}
          hitSlop={UI_SIZE_8}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t('folders.a11y.newNote')}
        >
          <SymbolIcon name="square.and.pencil" size={UI_ICON_SIZE_20} color={colors.text} />
        </Pressable>
      </GlassView>
    ),
    [
      handleCreateFolder,
      handleCreateNote,
      iconBtnStyle,
      colors.text,
      commonThemedStyles,
      styles.headerPill,
      t,
    ],
  )

  const renderFolders = useCallback(
    (foldersToRender: any[], startIndex = 0) =>
      foldersToRender.map((folder: any, index: number) => (
        <FolderRow
          key={folder.id || folder.key}
          id={folder.id || folder.key}
          name={folder.name}
          count={noteCounts[folder.id || folder.key] ?? 0}
          icon={getFolderIcon(folder)}
          isSystem={folder.isSystem}
          animationIndex={startIndex + index}
          onPress={handleSelectFolder}
          onRename={folder.isSystem ? undefined : handleRenameFolder}
          onDelete={folder.isSystem ? undefined : handleDeleteFolder}
        />
      )),
    [noteCounts, getFolderIcon, handleSelectFolder, handleRenameFolder, handleDeleteFolder],
  )

  const handleSearchChange = useCallback(
    (event: { nativeEvent: { text: string } }) => setSearchQuery(event.nativeEvent.text),
    [],
  )

  const screenOptions = useMemo(
    () => ({
      headerTitle: '',
      headerTransparent: true,
      headerLargeTitle: false,
      headerLeft,
      headerRight,
      headerSearchBarOptions: {
        placeholder: t('folders.searchPlaceholder'),
        hideWhenScrolling: false,
        textColor: colors.text,
        hintTextColor: colors.textSecondary,
        headerIconColor: colors.textSecondary,
        onChangeText: handleSearchChange,
      },
    }),
    [headerLeft, headerRight, handleSearchChange, t, colors.text, colors.textSecondary],
  )

  return (
    <View style={styles.container}>
      <Stack.Screen options={screenOptions} />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.pageTitle}>{t('folders.title')}</Text>
        <View style={styles.section}>{renderFolders(topFolders)}</View>

        {topFolders.length === 0 && archiveFolders.length === 0 && (
          <Text style={styles.emptyText}>{t('folders.noFoldersFound')}</Text>
        )}

        {archiveFolders.length > 0 && (
          <View style={styles.archiveSection}>
            <Text style={[commonThemedStyles.sectionCap, styles.sectionHeaderMargin]}>
              {t('folders.archiveHeader')}
            </Text>
            {renderFolders(archiveFolders, topFolders.length)}
          </View>
        )}
      </ScrollView>
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
      paddingTop: Space.lg,
    },
    pageTitle: {
      fontSize: FontSize.hero,
      lineHeight: UI_SIZE_42,
      fontWeight: FontWeight.heavy,
      letterSpacing: LetterSpacing.tight,
      color: theme.colors.text,
      marginLeft: Space.base,
      marginBottom: Space.sm,
    },
    headerPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Space.sm,
    },
    section: {
      backgroundColor: theme.colors.transparent,
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
    iconBtn: {
      ...commonStyles.centered,
      minWidth: UI_SIZE_44,
      minHeight: UI_SIZE_44,
      padding: Space.sm,
    },
  })
  return styles
})
