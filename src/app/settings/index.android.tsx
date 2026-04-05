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
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import type { AndroidColorTheme } from '@/providers/AndroidPaperProvider'

const SORT_OPTIONS = [
  { label: 'Date Edited', value: 'updatedAt' },
  { label: 'Date Created', value: 'createdAt' },
  { label: 'Title', value: 'title' },
]

const FONT_OPTIONS = [
  { label: 'Inter', value: 'Inter' },
  { label: 'Outfit', value: 'Outfit' },
  { label: 'Lora', value: 'Lora' },
  { label: 'Newsreader', value: 'Newsreader' },
  { label: 'IBM Plex Mono', value: 'IBM Plex Mono' },
  { label: 'System Default', value: 'System' },
  { label: 'Serif', value: 'Serif' },
  { label: 'Monospace', value: 'Mono' },
]

function showAndroidPicker(
  title: string,
  options: { label: string; value: string }[],
  onSelect: (value: string) => void,
) {
  Alert.alert(title, undefined, [
    ...options.map((o) => ({ text: o.label, onPress: () => onSelect(o.value) })),
    { text: 'Cancel', style: 'cancel' },
  ])
}

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
  if (hex.length === 7) return `${hex}${a}`
  return hex
}

export default function AndroidSettingsScreen() {
  const insets = useSafeAreaInsets()
  const theme = useMD3Theme()
  const c = theme.colors as any
  const dispatch = useDispatch()

  const currentTheme = useSelector(getTheme)
  const fontFamily = useSelector(getFontFamily)
  const editorFontSize = useSelector(getEditorFontSize)
  const sortBy = useSelector(getSortBy)
  const androidColorTheme = useSelector(getColorTheme) as AndroidColorTheme

  const supportsDynamicColor = useMemo(() => {
    return Platform.OS === 'android' && Number(Platform.Version) >= 31
  }, [])

  const colorThemeOptions = useMemo(() => {
    return [
      { label: 'Default', value: 'pear' as AndroidColorTheme },
      { label: 'Material You', value: 'material_you' as AndroidColorTheme },
    ]
  }, [])

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
        <Text style={dynStyles.headerTitle}>Settings</Text>
        <Pressable hitSlop={12} style={dynStyles.iconBtn}>
          <MaterialCommunityIcons name="magnify" size={24} color={c.primary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={dynStyles.scrollContent}
      >
        <Animated.View entering={FadeIn.duration(220).delay(20)}>
          <Text style={dynStyles.sectionCap}>GENERAL</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(240).delay(40)}
          layout={LinearTransition.springify().damping(20).stiffness(220)}
          style={dynStyles.card}
        >
          <Text style={dynStyles.cardTitle}>App Theme</Text>
          <View style={dynStyles.segContainer}>
            {(['system', 'light', 'dark'] as const).map((t, i) => {
              const isActive = currentTheme === t
              return (
                <Pressable
                  key={t}
                  onPress={() => dispatch(setTheme(t))}
                  style={[dynStyles.segItem, isActive && dynStyles.segItemActive]}
                >
                  <Text style={[dynStyles.segText, isActive && dynStyles.segTextActive]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
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
            <Text style={dynStyles.cardTitle}>Color Theme</Text>
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
            onPress={() =>
              showAndroidPicker('Sort Notes By', SORT_OPTIONS, (val) =>
                dispatch(updateSetting({ key: 'sortBy', value: val })),
              )
            }
            style={({ pressed }) => [dynStyles.groupPressRow, pressed && dynStyles.groupRowPressed]}
          >
            <View style={{ flex: 1 }}>
              <Text style={dynStyles.rowTitle}>Sort Notes By</Text>
              <Text style={dynStyles.rowSubtitle}>
                {SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Date Edited'}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={c.onSurfaceVariant} />
          </Pressable>

          <View style={dynStyles.groupDivider} />

          <Pressable
            onPress={() =>
              showAndroidPicker('Font Family', FONT_OPTIONS, (val) =>
                dispatch(updateSetting({ key: 'fontFamily', value: val })),
              )
            }
            style={({ pressed }) => [dynStyles.groupPressRow, pressed && dynStyles.groupRowPressed]}
          >
            <View style={{ flex: 1 }}>
              <Text style={dynStyles.rowTitle}>Font Family</Text>
              <Text style={dynStyles.rowSubtitle}>
                {FONT_OPTIONS.find((o) => o.value === fontFamily)?.label ?? fontFamily}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={c.onSurfaceVariant} />
          </Pressable>

          <View style={dynStyles.groupDivider} />

          <View style={dynStyles.groupContentRow}>
            <View style={dynStyles.sliderTitleContainer}>
              <Text style={dynStyles.rowTitle}>Text Size</Text>
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
          <Text style={dynStyles.sectionCapMargin}>SYNC & DEVICES</Text>
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
              <Text style={dynStyles.rowTitle}>Link and Sync</Text>
              <Text style={dynStyles.rowSubtitle}>Cloud backup enabled</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={c.primary} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(220).delay(180)}>
          <Text style={dynStyles.footerText}>End-to-end encrypted • Fully private</Text>
        </Animated.View>
      </ScrollView>
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
      justifyContent: 'space-between',
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
