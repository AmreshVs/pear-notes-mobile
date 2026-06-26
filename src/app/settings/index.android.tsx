import {
  getColorTheme,
  getEditorFontSize,
  getFontFamily,
  getSortBy,
  getTheme,
  setColorTheme,
  setTheme,
  updateSetting,
} from '@pear-notes/core/store/slices/settingsSlice.js'
import {
  deleteSyncedDevice,
  getSyncedDevices,
} from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import { clearStorage } from '@pear-notes/core/store/slices/syncSlice.js'
import Slider from '@react-native-community/slider'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router, Stack } from 'expo-router'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native'
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'

import { BottomActionSheet } from '@/components/android/BottomActionSheet'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontWeight,
  UI_FONT_SIZE_12,
  UI_FONT_SIZE_14,
  UI_FONT_SIZE_16,
  UI_FONT_SIZE_20,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_22,
  UI_ICON_SIZE_24,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_18,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_28,
  UI_SIZE_40,
  UI_SIZE_44,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'
import { deleteDbEncryptionKey } from '@/lib/secureStore'
import type { AndroidColorTheme } from '@/providers/AndroidPaperProvider'

export default function AndroidSettingsScreen() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const styles = useStyles()
  const theme = useTheme()
  const md3 = useMD3Theme()
  const c = md3.colors

  const currentTheme = useSelector(getTheme)
  const fontFamily = useSelector(getFontFamily)
  const editorFontSize = useSelector(getEditorFontSize)
  const sortBy = useSelector(getSortBy)
  const androidColorTheme = useSelector(getColorTheme) as AndroidColorTheme
  const syncedDevices = useSelector(getSyncedDevices)

  const localDevice = syncedDevices.find((d: any) => d.isLocal)
  const localDeviceKey = localDevice?.key

  const [sortBySheetVisible, setSortBySheetVisible] = React.useState(false)
  const [fontSheetVisible, setFontSheetVisible] = React.useState(false)
  const [resetSheetVisible, setResetSheetVisible] = React.useState(false)

  const sliderMaxTrackColor = useMemo(() => hexWithAlpha(c.primary, 0.2), [c.primary])

  const handleResetPress = useCallback(() => {
    setResetSheetVisible(true)
  }, [])

  const handleResetConfirm = useCallback(() => {
    setResetSheetVisible(false)
    if (syncedDevices.length > 1 && localDeviceKey) {
      dispatch(deleteSyncedDevice({ key: localDeviceKey } as any))
    } else {
      deleteDbEncryptionKey().catch(console.error)
      dispatch(clearStorage())
    }
    router.back()
  }, [dispatch, syncedDevices, localDeviceKey])

  const resetActions = useMemo(
    () => [
      {
        icon: 'trash-can-outline',
        label: t('settings.danger.resetApp'),
        destructive: true,
        onPress: handleResetConfirm,
      },
    ],
    [handleResetConfirm, t],
  )

  const supportsDynamicColor = useMemo(() => {
    return Platform.OS === 'android' && Number(Platform.Version) >= 31
  }, [])

  const SORT_OPTIONS = useMemo(
    () => [
      { label: t('settings.general.sortOptions.updatedAt'), value: 'updatedAt' },
      { label: t('settings.general.sortOptions.createdAt'), value: 'createdAt' },
      { label: t('settings.general.sortOptions.title'), value: 'title' },
    ],
    [t],
  )

  const FONT_OPTIONS = useMemo(
    () => [
      { label: t('settings.general.fontOptions.Inter'), value: 'Inter' },
      { label: t('settings.general.fontOptions.Outfit'), value: 'Outfit' },
      { label: t('settings.general.fontOptions.Lora'), value: 'Lora' },
      { label: t('settings.general.fontOptions.Newsreader'), value: 'Newsreader' },
      { label: t('settings.general.fontOptions.IBM Plex Mono'), value: 'IBM Plex Mono' },
      { label: t('settings.general.fontOptions.System'), value: 'System' },
      { label: t('settings.general.fontOptions.Serif'), value: 'Serif' },
      { label: t('settings.general.fontOptions.Mono'), value: 'Mono' },
    ],
    [t],
  )

  const handleSortSelect = useCallback(
    (value: string) => {
      dispatch(updateSetting({ key: 'sortBy', value }))
      setSortBySheetVisible(false)
    },
    [dispatch],
  )

  const sortByActions = useMemo(
    () => [
      {
        icon: 'clock-outline',
        label: t('settings.general.sortOptions.updatedAt'),
        onPress: () => handleSortSelect('updatedAt'),
      },
      {
        icon: 'calendar-plus',
        label: t('settings.general.sortOptions.createdAt'),
        onPress: () => handleSortSelect('createdAt'),
      },
      {
        icon: 'sort-alphabetical-variant',
        label: t('settings.general.sortOptions.title'),
        onPress: () => handleSortSelect('title'),
      },
    ],
    [handleSortSelect, t],
  )

  const fontActions = useMemo(
    () =>
      FONT_OPTIONS.map((f) => ({
        icon: 'format-font',
        label: f.label,
        onPress: () => {
          dispatch(updateSetting({ key: 'fontFamily', value: f.value }))
          setFontSheetVisible(false)
        },
      })),
    [dispatch, FONT_OPTIONS],
  )

  const colorThemeOptions = useMemo(() => {
    return [
      { label: t('settings.general.colorOptions.pear'), value: 'pear' as AndroidColorTheme },
      {
        label: t('settings.general.colorOptions.material_you'),
        value: 'material_you' as AndroidColorTheme,
      },
    ]
  }, [t])

  const handleSetTheme = useCallback(
    (themeValue: 'system' | 'light' | 'dark') => {
      dispatch(setTheme(themeValue))
    },
    [dispatch],
  )

  const renderThemeOption = useCallback(
    (tValue: 'system' | 'light' | 'dark') => {
      const isActive = currentTheme === tValue
      return (
        <Pressable
          key={tValue}
          onPress={() => handleSetTheme(tValue)}
          style={[styles.segItem, isActive && styles.segItemActive]}
        >
          <Text style={[styles.segText, isActive && styles.segTextActive]}>
            {t(`settings.general.themes.${tValue}`)}
          </Text>
        </Pressable>
      )
    },
    [currentTheme, handleSetTheme, styles, t],
  )

  const handleSetColorTheme = useCallback(
    (colorTheme: AndroidColorTheme) => {
      dispatch(setColorTheme(colorTheme))
    },
    [dispatch],
  )

  const renderColorThemeOption = useCallback(
    (opt: (typeof colorThemeOptions)[number]) => {
      const isActive = androidColorTheme === opt.value
      return (
        <Pressable
          key={opt.value}
          onPress={() => handleSetColorTheme(opt.value)}
          style={[styles.segItem, isActive && styles.segItemActive]}
        >
          <Text style={[styles.segText, isActive && styles.segTextActive]}>{opt.label}</Text>
        </Pressable>
      )
    },
    [androidColorTheme, handleSetColorTheme, styles],
  )

  const handleFontSizeChange = useCallback(
    (val: number) => {
      dispatch(updateSetting({ key: 'editorFontSize', value: Math.round(val) }))
    },
    [dispatch],
  )

  const handleSyncPress = useCallback(() => {
    router.push('/settings/sync')
  }, [])

  const handleBackupPress = useCallback(() => {
    router.push('/settings/backup' as any)
  }, [])

  const handleOpenSortSheet = useCallback(() => {
    setSortBySheetVisible(true)
  }, [])

  const handleOpenFontSheet = useCallback(() => {
    setFontSheetVisible(true)
  }, [])

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={styles.root.backgroundColor}
      />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={UI_SIZE_12} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={UI_ICON_SIZE_24} color={c.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeIn.duration(220).delay(20)}>
          <Text style={styles.sectionCap}>{t('settings.general.header')}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(240).delay(40)}
          layout={LinearTransition.springify().damping(20).stiffness(220)}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>{t('settings.general.appTheme')}</Text>
          <View style={styles.segContainer}>
            {(['system', 'light', 'dark'] as const).map(renderThemeOption)}
          </View>
        </Animated.View>
        {supportsDynamicColor && (
          <Animated.View
            entering={FadeInDown.duration(240).delay(60)}
            layout={LinearTransition.springify().damping(20).stiffness(220)}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>{t('settings.general.colorTheme')}</Text>
            <View style={styles.segContainer}>{colorThemeOptions.map(renderColorThemeOption)}</View>
          </Animated.View>
        )}
        <Animated.View
          entering={FadeInDown.duration(240).delay(80)}
          layout={LinearTransition.springify().damping(20).stiffness(220)}
          style={styles.groupCard}
        >
          <Pressable
            onPress={handleOpenSortSheet}
            style={({ pressed }) => [styles.groupPressRow, pressed && styles.groupRowPressed]}
          >
            <View style={commonStyles.flex1}>
              <Text style={styles.rowTitle}>{t('settings.general.sortNotesBy')}</Text>
              <Text style={styles.rowSubtitle}>
                {SORT_OPTIONS.find((o) => o.value === sortBy)?.label ??
                  t('settings.general.sortOptions.updatedAt')}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={UI_ICON_SIZE_20}
              color={c.onSurfaceVariant}
            />
          </Pressable>

          <View style={styles.groupDivider} />

          <Pressable
            onPress={handleOpenFontSheet}
            style={({ pressed }) => [styles.groupPressRow, pressed && styles.groupRowPressed]}
          >
            <View style={commonStyles.flex1}>
              <Text style={styles.rowTitle}>{t('settings.general.fontFamily')}</Text>
              <Text style={styles.rowSubtitle}>
                {FONT_OPTIONS.find((o) => o.value === fontFamily)?.label ?? fontFamily}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={UI_ICON_SIZE_20}
              color={c.onSurfaceVariant}
            />
          </Pressable>

          <View style={styles.groupDivider} />

          <View style={styles.groupContentRow}>
            <View style={styles.sliderTitleContainer}>
              <Text style={styles.rowTitle}>{t('settings.general.textSize')}</Text>
              <Text style={styles.sliderValueText}>{editorFontSize}</Text>
            </View>
            <View style={styles.sliderRow}>
              <MaterialCommunityIcons
                name="format-size"
                size={UI_ICON_SIZE_16}
                color={c.onSurfaceVariant}
              />
              <Slider
                style={styles.slider}
                minimumValue={12}
                maximumValue={24}
                step={1}
                value={editorFontSize}
                onValueChange={handleFontSizeChange}
                minimumTrackTintColor={c.primary}
                maximumTrackTintColor={sliderMaxTrackColor}
                thumbTintColor={c.primary}
              />
              <MaterialCommunityIcons
                name="format-size"
                size={UI_ICON_SIZE_24}
                color={c.onSurfaceVariant}
              />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(220).delay(140)}>
          <Text style={styles.sectionCapMargin}>{t('settings.sync.header')}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(240).delay(160)}
          layout={LinearTransition.springify().damping(20).stiffness(220)}
        >
          <Pressable
            onPress={handleSyncPress}
            style={({ pressed }) => [styles.cardRow, pressed && styles.cardPressed]}
          >
            <View style={styles.syncIconWrap}>
              <MaterialCommunityIcons name="sync" size={UI_ICON_SIZE_22} color={c.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>{t('settings.sync.linkAndSync')}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={UI_ICON_SIZE_20} color={c.primary} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(220).delay(180)}>
          <Text style={styles.sectionCapMargin}>{t('settings.backup.header')}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(240).delay(200)}
          layout={LinearTransition.springify().damping(20).stiffness(220)}
        >
          <Pressable
            onPress={handleBackupPress}
            style={({ pressed }) => [styles.cardRow, pressed && styles.cardPressed]}
          >
            <View style={styles.syncIconWrap}>
              <MaterialCommunityIcons
                name="cloud-download-outline"
                size={UI_ICON_SIZE_22}
                color={c.primary}
              />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>{t('settings.backup.backupAndRestore')}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={UI_ICON_SIZE_20} color={c.primary} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(220).delay(220)}>
          <Text style={styles.sectionCapMargin}>{t('settings.danger.header')}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(240).delay(240)}
          layout={LinearTransition.springify().damping(20).stiffness(220)}
        >
          <Pressable
            onPress={handleResetPress}
            style={({ pressed }) => [styles.cardRow, pressed && styles.cardPressed]}
          >
            <View style={styles.dangerIconWrap}>
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={UI_ICON_SIZE_22}
                color={c.error}
              />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.dangerTitle}>{t('settings.danger.resetApp')}</Text>
            </View>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(220).delay(260)}>
          <Text style={styles.footerText}>{t('settings.footer')}</Text>
        </Animated.View>
      </ScrollView>

      <BottomActionSheet
        visible={sortBySheetVisible}
        onDismiss={() => setSortBySheetVisible(false)}
        title={t('settings.general.sortNotesBy')}
        actions={sortByActions}
      />

      <BottomActionSheet
        visible={fontSheetVisible}
        onDismiss={() => setFontSheetVisible(false)}
        title={t('settings.general.fontFamily')}
        actions={fontActions}
      />

      <BottomActionSheet
        visible={resetSheetVisible}
        onDismiss={() => setResetSheetVisible(false)}
        title={t('settings.reset.confirmTitle')}
        subtitle={t('settings.reset.confirmMessage')}
        actions={resetActions}
      />
    </View>
  )
}

const useSettingsHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3, insets }) => {
  const c = md3.colors as any
  const styles = StyleSheet.create({
    root: {
      ...commonStyles.flex1,
      backgroundColor: c.background,
    },
    header: {
      ...commonStyles.row,
      paddingTop: insets.top + UI_SIZE_16,
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: UI_SIZE_16,
    },
    iconBtn: {
      width: UI_SIZE_40,
      height: UI_SIZE_40,
      ...commonStyles.centered,
    },
    headerTitle: {
      fontSize: UI_FONT_SIZE_20,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
      textAlign: 'left',
    },
    scrollContent: {
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: insets.bottom + UI_SIZE_40,
      paddingTop: UI_SIZE_10,
    },
    sectionCap: {
      fontSize: UI_FONT_SIZE_12,
      fontWeight: FontWeight.heavy,
      letterSpacing: 1.2,
      color: c.primary,
      marginBottom: UI_SIZE_16,
    },
    sectionCapMargin: {
      fontSize: UI_FONT_SIZE_12,
      fontWeight: FontWeight.heavy,
      letterSpacing: 1.2,
      color: c.primary,
      marginTop: UI_SIZE_24,
      marginBottom: UI_SIZE_16,
    },
    card: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      paddingHorizontal: UI_SIZE_20,
      paddingVertical: UI_SIZE_16,
      marginBottom: UI_SIZE_12,
    },
    cardRow: {
      ...commonStyles.row,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      paddingHorizontal: UI_SIZE_20,
      paddingVertical: UI_SIZE_18,
    },
    cardPressed: {
      backgroundColor: c.surfaceContainerHighest ?? c.surfaceVariant,
    },
    groupCard: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      marginBottom: UI_SIZE_12,
      overflow: 'hidden',
    },
    groupPressRow: {
      ...commonStyles.row,
      paddingHorizontal: UI_SIZE_20,
      paddingVertical: UI_SIZE_18,
    },
    groupContentRow: {
      paddingHorizontal: UI_SIZE_20,
      paddingVertical: UI_SIZE_18,
    },
    groupRowPressed: {
      backgroundColor: hexWithAlpha(c.onSurface, 0.08),
    },
    groupDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: hexWithAlpha(c.outlineVariant, 0.5),
      marginLeft: UI_SIZE_20,
    },
    cardTitle: {
      fontSize: UI_FONT_SIZE_16,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
      marginBottom: UI_SIZE_20,
    },
    segContainer: {
      ...commonStyles.row,
      backgroundColor: hexWithAlpha(c.onSurface, 0.04),
      borderRadius: UI_SIZE_9999,
      padding: UI_SIZE_4,
    },
    segItem: {
      ...commonStyles.flex1,
      paddingVertical: UI_SIZE_12,
      borderRadius: UI_SIZE_9999,
      ...commonStyles.centered,
    },
    segItemActive: {
      backgroundColor: c.primaryContainer,
    },
    segText: {
      fontSize: UI_FONT_SIZE_14,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurfaceVariant,
    },
    segTextActive: {
      color: c.onPrimaryContainer,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
    },
    rowTitle: {
      fontSize: UI_FONT_SIZE_16,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
      marginBottom: UI_SIZE_4,
    },
    rowSubtitle: {
      fontSize: UI_FONT_SIZE_14,
      color: c.onSurfaceVariant,
      fontFamily: FontFamily.medium,
      fontWeight: FontWeight.medium,
    },
    sliderTitleContainer: {
      ...commonStyles.rowBetween,
      marginBottom: UI_SIZE_16,
    },
    sliderValueText: {
      fontSize: UI_FONT_SIZE_16,
      fontWeight: FontWeight.heavy,
      fontFamily: FontFamily.extraBold,
      color: c.primary,
    },
    sliderRow: {
      ...commonStyles.row,
      paddingHorizontal: UI_SIZE_8,
    },
    slider: {
      ...commonStyles.flex1,
      marginHorizontal: UI_SIZE_12,
      height: UI_SIZE_40,
    },
    syncIconWrap: {
      width: UI_SIZE_44,
      height: UI_SIZE_44,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
      ...commonStyles.centered,
    },
    dangerIconWrap: {
      width: UI_SIZE_44,
      height: UI_SIZE_44,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.error, 0.15),
      ...commonStyles.centered,
    },
    dangerTitle: {
      fontSize: UI_FONT_SIZE_16,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.error,
    },
    rowContent: {
      ...commonStyles.flex1,
      marginLeft: UI_SIZE_16,
    },
    footerText: {
      textAlign: 'center',
      fontSize: UI_FONT_SIZE_12,
      fontStyle: 'italic',
      color: c.onSurfaceVariant,
      marginTop: UI_SIZE_20,
    },
  })
  return styles
}, useSettingsHooks)
