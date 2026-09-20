import { memo, type RefObject, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ViewStyle } from 'react-native'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import Animated, { type AnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { SEARCH_QUERY_MAX_LENGTH } from '@pear-notes/core/constant.js'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_24,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_14,
  UI_SIZE_20,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainer?: string
  outlineVariant?: string
  onSurfaceVariant?: string
}

type AndroidFolderAppBarProps = {
  searchVisible: boolean
  searchQuery: string
  showFolderOptions: boolean
  canMultiSelect: boolean
  canSearch: boolean
  searchInputRef: RefObject<TextInput | null>
  searchBarStyle: AnimatedStyle<ViewStyle>
  onBack: () => void
  showBack?: boolean
  showCreateNote?: boolean
  onCreateNote?: () => void
  onStartSelecting: () => void
  onToggleSearch: () => void
  onOpenFolderOptions: () => void
  onChangeSearch: (text: string) => void
  onClearSearch: () => void
}

export const AndroidFolderAppBar = memo(function AndroidFolderAppBar({
  searchVisible,
  searchQuery,
  showFolderOptions,
  canMultiSelect,
  canSearch,
  searchInputRef,
  searchBarStyle,
  onBack,
  showBack = true,
  showCreateNote,
  onCreateNote,
  onStartSelecting,
  onToggleSearch,
  onOpenFolderOptions,
  onChangeSearch,
  onClearSearch,
}: AndroidFolderAppBarProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors

  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const selectAccessibilityState = useMemo(() => ({ disabled: !canMultiSelect }), [canMultiSelect])
  const searchAccessibilityState = useMemo(() => ({ disabled: !canSearch }), [canSearch])

  return (
    <>
      <View style={styles.appBar}>
        <View style={styles.appBarLeft}>
          {showBack && (
            <Pressable
              onPress={onBack}
              android_ripple={ripple}
              style={styles.iconBtn}
              hitSlop={UI_SIZE_8}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={UI_ICON_SIZE_24}
                color={c.primary}
              />
            </Pressable>
          )}
        </View>

        <View style={styles.appBarRight}>
          {showCreateNote && (
            <Pressable
              onPress={onCreateNote}
              android_ripple={ripple}
              style={styles.iconBtn}
              hitSlop={UI_SIZE_8}
              accessibilityRole="button"
              accessibilityLabel={t('folderView.empty.newNoteBtn')}
            >
              <MaterialCommunityIcons
                name="square-edit-outline"
                size={UI_ICON_SIZE_24}
                color={c.primary}
              />
            </Pressable>
          )}
          <Pressable
            onPress={onStartSelecting}
            disabled={!canMultiSelect}
            android_ripple={canMultiSelect ? ripple : undefined}
            style={[styles.iconBtn, !canMultiSelect && commonStyles.disabled]}
            hitSlop={UI_SIZE_8}
            accessibilityRole="button"
            accessibilityState={selectAccessibilityState}
            accessibilityLabel={t('folderView.selection.select')}
          >
            <MaterialCommunityIcons
              name="checkbox-multiple-outline"
              size={UI_ICON_SIZE_24}
              color={c.primary}
            />
          </Pressable>
          <Pressable
            onPress={onToggleSearch}
            disabled={!canSearch}
            android_ripple={canSearch ? ripple : undefined}
            style={[styles.iconBtn, !canSearch && commonStyles.disabled]}
            hitSlop={UI_SIZE_8}
            accessibilityRole="button"
            accessibilityState={searchAccessibilityState}
            accessibilityLabel={searchVisible ? t('common.close') : t('search.title')}
          >
            <MaterialCommunityIcons
              name={searchVisible ? 'close' : 'magnify'}
              size={UI_ICON_SIZE_24}
              color={c.primary}
            />
          </Pressable>
          {showFolderOptions && (
            <Pressable
              onPress={onOpenFolderOptions}
              android_ripple={ripple}
              style={styles.iconBtn}
              hitSlop={UI_SIZE_8}
              accessibilityRole="button"
              accessibilityLabel={t('folders.options')}
            >
              <MaterialCommunityIcons
                name="dots-vertical"
                size={UI_ICON_SIZE_24}
                color={c.primary}
              />
            </Pressable>
          )}
        </View>
      </View>

      <Animated.View style={[styles.searchWrap, searchBarStyle]}>
        <View style={styles.searchPill}>
          <MaterialCommunityIcons
            name="magnify"
            size={UI_ICON_SIZE_20}
            color={c.onSurfaceVariant}
            style={styles.searchIcon}
          />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder={t('folderView.searchPlaceholder')}
            placeholderTextColor={c.onSurfaceVariant}
            accessibilityLabel={t('folderView.searchPlaceholder')}
            value={searchQuery}
            onChangeText={onChangeSearch}
            maxLength={SEARCH_QUERY_MAX_LENGTH}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={onClearSearch} android_ripple={ripple} hitSlop={UI_SIZE_8}>
              <MaterialCommunityIcons
                name="close-circle"
                size={UI_ICON_SIZE_16}
                color={c.onSurfaceVariant}
              />
            </Pressable>
          )}
        </View>
      </Animated.View>
    </>
  )
})

const useFolderAppBarHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks(
  (theme, { md3, insets }: ReturnType<typeof useFolderAppBarHooks>) => {
    const c = md3.colors as ExtendedColors
    const styles = StyleSheet.create({
      appBar: {
        ...commonStyles.row,
        justifyContent: 'space-between',
        paddingHorizontal: UI_SIZE_8,
        paddingTop: insets.top + UI_SIZE_4,
        backgroundColor: theme.colors.transparent,
      },
      appBarLeft: {
        ...commonStyles.row,
        gap: UI_SIZE_4,
        ...commonStyles.flex1,
      },
      appBarRight: {
        ...commonStyles.row,
      },
      iconBtn: {
        overflow: 'hidden',
        padding: UI_SIZE_8,
        borderRadius: UI_SIZE_9999,
      },
      searchWrap: {
        paddingHorizontal: UI_SIZE_20,
      },
      searchPill: {
        ...commonStyles.row,
        borderRadius: UI_SIZE_9999,
        paddingHorizontal: UI_SIZE_20,
        paddingVertical: UI_SIZE_14,
        backgroundColor: c.surfaceContainer,
        borderColor: hexWithAlpha(c.outlineVariant, 0.15),
      },
      searchIcon: {
        marginRight: UI_SIZE_10,
      },
      searchInput: {
        ...commonStyles.flex1,
        fontSize: FontSize.subtitle,
        fontFamily: FontFamily.medium,
        paddingVertical: 0,
        color: c.onSurface,
      },
    })
    return styles
  },
  useFolderAppBarHooks,
)
