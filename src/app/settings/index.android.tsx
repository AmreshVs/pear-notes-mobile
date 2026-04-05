import { MaterialCommunityIcons } from '@expo/vector-icons'
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
import Slider from '@react-native-community/slider'
import { router, Stack } from 'expo-router'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'

import { BottomActionSheet } from '@/components/android/BottomActionSheet'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import type { AndroidColorTheme } from '@/providers/AndroidPaperProvider'

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
  if (hex.length === 7) return `${hex}${a}`
  return hex
}

export default function AndroidSettingsScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const theme = useMD3Theme()
  const c = theme.colors as any
  const dispatch = useDispatch()

  const currentTheme = useSelector(getTheme)
  const fontFamily = useSelector(getFontFamily)
  const editorFontSize = useSelector(getEditorFontSize)
  const sortBy = useSelector(getSortBy)
  const androidColorTheme = useSelector(getColorTheme) as AndroidColorTheme

  const [sortBySheetVisible, setSortBySheetVisible] = React.useState(false)
  const [fontSheetVisible, setFontSheetVisible] = React.useState(false)

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

  const sortByActions = useMemo(
    () => [
      {
        icon: 'clock-outline',
        label: t('settings.general.sortOptions.updatedAt'),
        onPress: () => {
          dispatch(updateSetting({ key: 'sortBy', value: 'updatedAt' }))
          setSortBySheetVisible(false)
        },
      },
      {
        icon: 'calendar-plus',
        label: t('settings.general.sortOptions.createdAt'),
        onPress: () => {
          dispatch(updateSetting({ key: 'sortBy', value: 'createdAt' }))
          setSortBySheetVisible(false)
        },
      },
      {
        icon: 'sort-alphabetical-variant',
        label: t('settings.general.sortOptions.title'),
        onPress: () => {
          dispatch(updateSetting({ key: 'sortBy', value: 'title' }))
          setSortBySheetVisible(false)
        },
      },
    ],
    [dispatch, t],
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

  const dynStyles = useMemo(() => createDynamicStyles(c, insets), [c, insets])

  return (
    <View style={dynStyles.root}>
      <StatusBar
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={c.background}
      />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={dynStyles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={dynStyles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={c.primary} />
        </Pressable>
        <Text style={dynStyles.headerTitle}>{t('settings.title')}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={dynStyles.scrollContent}
      >
        <Animated.View entering={FadeIn.duration(220).delay(20)}>
          <Text style={dynStyles.sectionCap}>{t('settings.general.header')}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(240).delay(40)}
          layout={LinearTransition.springify().damping(20).stiffness(220)}
          style={dynStyles.card}
        >
          <Text style={dynStyles.cardTitle}>{t('settings.general.appTheme')}</Text>
          <View style={dynStyles.segContainer}>
            {(['system', 'light', 'dark'] as const).map((tValue, i) => {
              const isActive = currentTheme === tValue
              return (
                <Pressable
                  key={tValue}
                  onPress={() => dispatch(setTheme(tValue))}
                  style={[dynStyles.segItem, isActive && dynStyles.segItemActive]}
                >
                  <Text style={[dynStyles.segText, isActive && dynStyles.segTextActive]}>
                    {t(`settings.general.themes.${tValue}`)}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </Animated.View>
        {supportsDynamicColor && (
          <Animated.View
            entering={FadeInDown.duration(240).delay(60)}
            layout={LinearTransition.springify().damping(20).stiffness(220)}
            style={dynStyles.card}
          >
            <Text style={dynStyles.cardTitle}>{t('settings.general.colorTheme')}</Text>
            <View style={dynStyles.segContainer}>
              {colorThemeOptions.map((opt) => {
                const isActive = androidColorTheme === opt.value
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => dispatch(setColorTheme(opt.value))}
                    style={[dynStyles.segItem, isActive && dynStyles.segItemActive]}
                  >
                    <Text style={[dynStyles.segText, isActive && dynStyles.segTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </Animated.View>
        )}
        <Animated.View
          entering={FadeInDown.duration(240).delay(80)}
          layout={LinearTransition.springify().damping(20).stiffness(220)}
          style={dynStyles.groupCard}
        >
          <Pressable
            onPress={() => setSortBySheetVisible(true)}
            style={({ pressed }) => [dynStyles.groupPressRow, pressed && dynStyles.groupRowPressed]}
          >
            <View style={{ flex: 1 }}>
              <Text style={dynStyles.rowTitle}>{t('settings.general.sortNotesBy')}</Text>
              <Text style={dynStyles.rowSubtitle}>
                {SORT_OPTIONS.find((o) => o.value === sortBy)?.label ??
                  t('settings.general.sortOptions.updatedAt')}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={c.onSurfaceVariant} />
          </Pressable>

          <View style={dynStyles.groupDivider} />

          <Pressable
            onPress={() => setFontSheetVisible(true)}
            style={({ pressed }) => [dynStyles.groupPressRow, pressed && dynStyles.groupRowPressed]}
          >
            <View style={{ flex: 1 }}>
              <Text style={dynStyles.rowTitle}>{t('settings.general.fontFamily')}</Text>
              <Text style={dynStyles.rowSubtitle}>
                {FONT_OPTIONS.find((o) => o.value === fontFamily)?.label ?? fontFamily}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={c.onSurfaceVariant} />
          </Pressable>

          <View style={dynStyles.groupDivider} />

          <View style={dynStyles.groupContentRow}>
            <View style={dynStyles.sliderTitleContainer}>
              <Text style={dynStyles.rowTitle}>{t('settings.general.textSize')}</Text>
              <Text style={dynStyles.sliderValueText}>{editorFontSize}</Text>
            </View>
            <View style={dynStyles.sliderRow}>
              <MaterialCommunityIcons name="format-size" size={16} color={c.onSurfaceVariant} />
              <Slider
                style={dynStyles.slider}
                minimumValue={12}
                maximumValue={24}
                step={1}
                value={editorFontSize}
                onValueChange={(val) =>
                  dispatch(updateSetting({ key: 'editorFontSize', value: Math.round(val) }))
                }
                minimumTrackTintColor={c.primary}
                maximumTrackTintColor={hexWithAlpha(c.primary, 0.2)}
                thumbTintColor={c.primary}
              />
              <MaterialCommunityIcons name="format-size" size={24} color={c.onSurfaceVariant} />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(220).delay(140)}>
          <Text style={dynStyles.sectionCapMargin}>{t('settings.sync.header')}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(240).delay(160)}
          layout={LinearTransition.springify().damping(20).stiffness(220)}
        >
          <Pressable
            onPress={() => router.push('/settings/sync')}
            style={({ pressed }) => [dynStyles.cardRow, pressed && dynStyles.cardPressed]}
          >
            <View style={dynStyles.syncIconWrap}>
              <MaterialCommunityIcons name="sync" size={22} color={c.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={dynStyles.rowTitle}>{t('settings.sync.linkAndSync')}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={c.primary} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(220).delay(180)}>
          <Text style={dynStyles.footerText}>{t('settings.footer')}</Text>
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
    </View>
  )
}

function createDynamicStyles(c: any, insets: any) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: insets.top + 16,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    iconBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      fontFamily: 'PlusJakartaSans_700Bold',
      color: c.onSurface,
      textAlign: 'left',
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: insets.bottom + 40,
      paddingTop: 10,
    },
    sectionCap: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: c.primary,
      marginBottom: 16,
    },
    sectionCapMargin: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: c.primary,
      marginTop: 32,
      marginBottom: 16,
    },
    card: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: 28,
      paddingHorizontal: 20,
      paddingVertical: 16,
      marginBottom: 12,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: 28,
      paddingHorizontal: 20,
      paddingVertical: 18,
      marginBottom: 12,
    },
    cardPressed: {
      backgroundColor: c.surfaceContainerHighest ?? c.surfaceVariant,
    },
    groupCard: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: 28,
      marginBottom: 12,
      overflow: 'hidden' as const,
    },
    groupPressRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 20,
      paddingVertical: 18,
    },
    groupContentRow: {
      paddingHorizontal: 20,
      paddingVertical: 18,
    },
    groupRowPressed: {
      backgroundColor: hexWithAlpha(c.onSurface, 0.08),
    },
    groupDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: hexWithAlpha(c.outlineVariant, 0.5),
      marginLeft: 20,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      fontFamily: 'PlusJakartaSans_600SemiBold',
      color: c.onSurface,
      marginBottom: 20,
    },
    segContainer: {
      flexDirection: 'row',
      backgroundColor: hexWithAlpha(c.onSurface, 0.04),
      borderRadius: 9999,
      padding: 4,
    },
    segItem: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 9999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segItemActive: {
      backgroundColor: c.primaryContainer,
    },
    segText: {
      fontSize: 14,
      fontWeight: '600',
      fontFamily: 'PlusJakartaSans_600SemiBold',
      color: c.onSurfaceVariant,
    },
    segTextActive: {
      color: c.onPrimaryContainer,
      fontWeight: '700',
      fontFamily: 'PlusJakartaSans_700Bold',
    },
    rowTitle: {
      fontSize: 16,
      fontWeight: '600',
      fontFamily: 'PlusJakartaSans_600SemiBold',
      color: c.onSurface,
      marginBottom: 4,
    },
    rowSubtitle: {
      fontSize: 14,
      color: c.onSurfaceVariant,
      fontFamily: 'PlusJakartaSans_500Medium',
      fontWeight: '500',
    },
    sliderTitleContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sliderValueText: {
      fontSize: 16,
      fontWeight: '800',
      fontFamily: 'PlusJakartaSans_800ExtraBold',
      color: c.primary,
    },
    sliderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    slider: {
      flex: 1,
      marginHorizontal: 12,
      height: 40,
    },
    syncIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 9999,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
      justifyContent: 'center',
      alignItems: 'center',
    },
    footerText: {
      textAlign: 'center',
      fontSize: 12,
      fontStyle: 'italic',
      color: c.onSurfaceVariant,
      marginTop: 20,
    },
  })
}
