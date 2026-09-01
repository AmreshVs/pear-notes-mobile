import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native'
import { Switch } from 'react-native-paper'
import { Easing, FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'
import Slider from '@react-native-community/slider'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router, Stack } from 'expo-router'

import {
  getEditorFontSize,
  getFontFamily,
  getSortBy,
  getTheme,
  setTheme,
  updateSetting,
} from '@pear-notes/core/store/slices/settingsSlice.js'

import { BottomActionSheet } from '@/components/android/BottomActionSheet'
import { useMD3CommonStyles } from '@/components/android/useMD3CommonStyles'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { MotionView } from '@/components/MotionView'
import { BackgroundSyncSection } from '@/components/settings/BackgroundSyncSection.android'
import { MediaSyncSection } from '@/components/settings/MediaSyncSection'
import { useHapticsPreference } from '@/components/settings/useHapticsPreference'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Layout,
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
  UI_SIZE_28,
  UI_SIZE_40,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { useAndroidColorTheme } from '@/hooks/useAndroidColorTheme'
import { AndroidColorTheme, setAndroidColorTheme } from '@/lib/androidColorTheme'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import { hapticSelection } from '@/lib/haptics'
import { getFontOptions } from '@/utils/settingsUtils'

export default function AndroidGeneralSettingsScreen() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const styles = useStyles()
  const md3Styles = useMD3CommonStyles()
  const theme = useTheme()
  const md3 = useMD3Theme()
  const c = md3.colors

  const currentTheme = useSelector(getTheme)
  const fontFamily = useSelector(getFontFamily)
  const editorFontSize = useSelector(getEditorFontSize)
  const sortBy = useSelector(getSortBy)
  const androidColorTheme = useAndroidColorTheme()
  const { hapticsEnabled, toggleHaptics } = useHapticsPreference()

  const [sortBySheetVisible, setSortBySheetVisible] = React.useState(false)

  const sliderMaxTrackColor = useMemo(() => hexWithAlpha(c.primary, 0.2), [c.primary])
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const rippleBorderless = useMemo(() => androidRipple(c.onSurface), [c.onSurface])

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

  const handleSortSelect = useCallback(
    (value: string) => {
      hapticSelection()
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
        selected: sortBy === 'updatedAt',
        onPress: () => handleSortSelect('updatedAt'),
      },
      {
        icon: 'calendar-plus',
        label: t('settings.general.sortOptions.createdAt'),
        selected: sortBy === 'createdAt',
        onPress: () => handleSortSelect('createdAt'),
      },
      {
        icon: 'sort-alphabetical-variant',
        label: t('settings.general.sortOptions.title'),
        selected: sortBy === 'title',
        onPress: () => handleSortSelect('title'),
      },
    ],
    [handleSortSelect, t, sortBy],
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
      hapticSelection()
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
          android_ripple={ripple}
          style={[styles.segItem, isActive && styles.segItemActive]}
        >
          <Text style={[styles.segText, isActive && styles.segTextActive]}>
            {t(`settings.general.themes.${tValue}`)}
          </Text>
        </Pressable>
      )
    },
    [currentTheme, handleSetTheme, ripple, styles, t],
  )

  const handleSetColorTheme = useCallback((colorTheme: AndroidColorTheme) => {
    hapticSelection()
    setAndroidColorTheme(colorTheme)
  }, [])

  const renderColorThemeOption = useCallback(
    (opt: (typeof colorThemeOptions)[number]) => {
      const isActive = androidColorTheme === opt.value
      return (
        <Pressable
          key={opt.value}
          onPress={() => handleSetColorTheme(opt.value)}
          android_ripple={ripple}
          style={[styles.segItem, isActive && styles.segItemActive]}
        >
          <Text style={[styles.segText, isActive && styles.segTextActive]}>{opt.label}</Text>
        </Pressable>
      )
    },
    [androidColorTheme, handleSetColorTheme, ripple, styles],
  )

  const handleFontSizeChange = useCallback(
    (val: number) => {
      dispatch(updateSetting({ key: 'editorFontSize', value: Math.round(val) }))
    },
    [dispatch],
  )

  const handleOpenSortSheet = useCallback(() => {
    setSortBySheetVisible(true)
  }, [])

  const handleOpenFontSheet = useCallback(() => {
    router.push('/settings/font' as any)
  }, [])

  return (
    <View style={styles.root}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          android_ripple={rippleBorderless}
          hitSlop={UI_SIZE_12}
          style={styles.iconBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={UI_ICON_SIZE_24} color={c.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('layouts.general')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <MotionView entering={FadeIn.duration(220).delay(20)}>
          <Text style={md3Styles.settingsSectionCap}>{t('settings.general.interface')}</Text>
        </MotionView>

        <MotionView
          entering={FadeInDown.duration(240).delay(40)}
          layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>{t('settings.general.appTheme')}</Text>
          <View style={styles.segContainer}>
            {(['system', 'light', 'dark'] as const).map(renderThemeOption)}
          </View>
        </MotionView>
        {supportsDynamicColor && (
          <MotionView
            entering={FadeInDown.duration(240).delay(60)}
            layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>{t('settings.general.colorTheme')}</Text>
            <View style={styles.segContainer}>{colorThemeOptions.map(renderColorThemeOption)}</View>
          </MotionView>
        )}

        <MotionView
          entering={FadeInDown.duration(240).delay(70)}
          layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
          style={styles.groupCard}
        >
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.rowTitle}>{t('settings.general.hapticFeedback')}</Text>
              <Text style={styles.rowSubtitle}>{t('settings.general.hapticFeedbackDesc')}</Text>
            </View>
            <Switch value={hapticsEnabled} onValueChange={toggleHaptics} />
          </View>
        </MotionView>

        <MotionView entering={FadeIn.duration(220).delay(80)}>
          <Text style={md3Styles.settingsSectionCapSpaced}>{t('settings.general.notesList')}</Text>
        </MotionView>

        <MotionView
          entering={FadeInDown.duration(240).delay(100)}
          layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
          style={styles.groupCard}
        >
          <Pressable
            onPress={handleOpenSortSheet}
            android_ripple={ripple}
            style={styles.groupPressRow}
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
        </MotionView>

        <MotionView entering={FadeIn.duration(220).delay(120)}>
          <Text style={md3Styles.settingsSectionCapSpaced}>{t('settings.general.editor')}</Text>
        </MotionView>

        <MotionView
          entering={FadeInDown.duration(240).delay(140)}
          layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
          style={styles.groupCard}
        >
          <Pressable
            onPress={handleOpenFontSheet}
            android_ripple={ripple}
            style={styles.groupPressRow}
          >
            <View style={commonStyles.flex1}>
              <Text style={styles.rowTitle}>{t('settings.general.fontFamily')}</Text>
              <Text style={styles.rowSubtitle}>
                {getFontOptions(t).find((o) => o.value === fontFamily)?.label ?? fontFamily}
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
              <Text style={styles.sliderValueText}>
                {t('settings.general.textSizeValue', { size: editorFontSize })}
              </Text>
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
        </MotionView>

        <BackgroundSyncSection />

        <MediaSyncSection />
      </ScrollView>

      <BottomActionSheet
        visible={sortBySheetVisible}
        onDismiss={() => setSortBySheetVisible(false)}
        title={t('settings.general.sortNotesBy')}
        actions={sortByActions}
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
      fontSize: FontSize.title,
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
    card: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      paddingHorizontal: UI_SIZE_20,
      paddingVertical: UI_SIZE_16,
      marginBottom: UI_SIZE_12,
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
    toggleRow: {
      ...commonStyles.rowBetween,
      paddingHorizontal: UI_SIZE_20,
      paddingVertical: UI_SIZE_18,
      gap: UI_SIZE_16,
    },
    toggleInfo: {
      ...commonStyles.flex1,
    },
    groupDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: hexWithAlpha(c.outlineVariant, 0.5),
      marginLeft: UI_SIZE_20,
    },
    cardTitle: {
      fontSize: FontSize.subtitle,
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
      overflow: 'hidden',
      ...commonStyles.flex1,
      paddingVertical: UI_SIZE_12,
      borderRadius: UI_SIZE_9999,
      borderWidth: Layout.segPillBorderWidth,
      borderColor: 'transparent',
      ...commonStyles.centered,
    },
    segItemActive: {
      backgroundColor: c.primaryContainer,
      borderColor: c.primary,
    },
    segText: {
      fontSize: FontSize.body,
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
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
      marginBottom: UI_SIZE_4,
    },
    rowSubtitle: {
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
      fontFamily: FontFamily.medium,
      fontWeight: FontWeight.medium,
    },
    sliderTitleContainer: {
      ...commonStyles.rowBetween,
      marginBottom: UI_SIZE_16,
    },
    sliderValueText: {
      fontSize: FontSize.subtitle,
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
  })
  return styles
}, useSettingsHooks)
