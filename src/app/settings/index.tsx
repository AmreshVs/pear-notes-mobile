import {
  getEditorFontSize,
  getFontFamily,
  getSortBy,
  getTheme,
  setTheme,
  updateSetting,
} from '@pear-notes/core/store/slices/settingsSlice.js'
import Slider from '@react-native-community/slider'
import { router, Stack } from 'expo-router'
import { ChevronRight, RefreshCw, X } from 'lucide-react-native'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ActionSheetIOS, Pressable, View as RNView, ScrollView, StyleSheet } from 'react-native'
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated'
import { useDispatch, useSelector } from 'react-redux'

import { Text, Theme, useTheme, useThemedStyles } from '@/components/Themed'
import {
  FontSize,
  FontWeight,
  LetterSpacing,
  Radii,
  Space,
  useCommonStyles,
} from '@/constants/commonStyles'

const GET_SORT_OPTIONS = (t: any) => [
  { label: t('settings.general.sortOptions.updatedAt'), value: 'updatedAt' },
  { label: t('settings.general.sortOptions.createdAt'), value: 'createdAt' },
  { label: t('settings.general.sortOptions.title'), value: 'title' },
]

const GET_FONT_OPTIONS = (t: any) => [
  { label: t('settings.general.fontOptions.Inter'), value: 'Inter' },
  { label: t('settings.general.fontOptions.Outfit'), value: 'Outfit' },
  { label: t('settings.general.fontOptions.Lora'), value: 'Lora' },
  { label: t('settings.general.fontOptions.Newsreader'), value: 'Newsreader' },
  { label: t('settings.general.fontOptions.IBM Plex Mono'), value: 'IBM Plex Mono' },
  { label: t('settings.general.fontOptions.System'), value: 'System' },
  { label: t('settings.general.fontOptions.Serif'), value: 'Serif' },
  { label: t('settings.general.fontOptions.Mono'), value: 'Mono' },
]

function showPicker(
  title: string,
  options: { label: string; value: string }[],
  onSelect: (value: string) => void,
  cancelLabel: string,
) {
  const labels = [...options.map((o) => o.label), cancelLabel]
  ActionSheetIOS.showActionSheetWithOptions(
    { options: labels, cancelButtonIndex: labels.length - 1, title },
    (index) => {
      if (index < options.length) onSelect(options[index].value)
    },
  )
}

export default function SettingsScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { colors } = theme
  const styles = useThemedStyles(createStyles)
  const common = useCommonStyles()
  const dispatch = useDispatch()

  const currentTheme = useSelector(getTheme)
  const fontFamily = useSelector(getFontFamily)
  const editorFontSize = useSelector(getEditorFontSize)
  const sortBy = useSelector(getSortBy)

  return (
    <RNView style={styles.container}>
      <Stack.Screen
        options={{
          title: t('settings.title'),
          headerRight: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              style={({ pressed }) => [styles.closeBtn, pressed && common.pressed]}
            >
              <X size={16} color={colors.text} strokeWidth={2.5} />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(220)}>
          <Text style={styles.sectionCap}>{t('settings.general.header')}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(240).delay(40)}
          layout={LinearTransition.springify().damping(20).stiffness(220)}
        >
          <RNView style={common.card}>
            <RNView style={styles.rowUnderline}>
              <Text style={styles.rowLabel}>{t('settings.general.appTheme')}</Text>
              <RNView style={styles.segCtrl}>
                {(['system', 'light', 'dark'] as const).map((themeKey, i) => {
                  const isActive = currentTheme === themeKey
                  return (
                    <Pressable
                      key={themeKey}
                      onPress={() => dispatch(setTheme(themeKey))}
                      style={[
                        styles.segPill,
                        isActive && styles.segPillActive,
                        i === 0 && styles.radiusLeft,
                        i === 2 && styles.radiusRight,
                      ]}
                    >
                      <Text style={[styles.segText, isActive && styles.segTextActive]}>
                        {t(`settings.general.themes.${themeKey}`)}
                      </Text>
                    </Pressable>
                  )
                })}
              </RNView>
            </RNView>

            <Pressable
              onPress={() =>
                showPicker(
                  t('settings.general.sortNotesBy'),
                  GET_SORT_OPTIONS(t),
                  (val) => dispatch(updateSetting({ key: 'sortBy', value: val })),
                  t('common.cancel'),
                )
              }
              style={({ pressed }) => [styles.rowUnderline, pressed && styles.rowPressed]}
            >
              <Text style={styles.rowLabel}>{t('settings.general.sortNotesBy')}</Text>
              <RNView style={common.settingsRowRight}>
                <Text style={styles.rowVal}>
                  {GET_SORT_OPTIONS(t).find((o) => o.value === sortBy)?.label ??
                    t('settings.general.sortOptions.updatedAt')}
                </Text>
                <ChevronRight size={15} color={colors.textMuted} />
              </RNView>
            </Pressable>

            <Pressable
              onPress={() =>
                showPicker(
                  t('settings.general.fontFamily'),
                  GET_FONT_OPTIONS(t),
                  (val) => dispatch(updateSetting({ key: 'fontFamily', value: val })),
                  t('common.cancel'),
                )
              }
              style={({ pressed }) => [styles.rowUnderline, pressed && styles.rowPressed]}
            >
              <Text style={styles.rowLabel}>{t('settings.general.fontFamily')}</Text>
              <RNView style={common.settingsRowRight}>
                <Text style={styles.rowVal}>
                  {GET_FONT_OPTIONS(t).find((o) => o.value === fontFamily)?.label ?? fontFamily}
                </Text>
                <ChevronRight size={15} color={colors.textMuted} />
              </RNView>
            </Pressable>

            <RNView style={styles.sliderRow}>
              <RNView style={styles.sliderHeader}>
                <Text style={styles.rowLabel}>{t('settings.general.textSize')}</Text>
                <RNView style={styles.badge}>
                  <Text style={styles.badgeText}>{editorFontSize}</Text>
                </RNView>
              </RNView>
              <RNView style={styles.sliderContainer}>
                <Text style={styles.sizeSm}>A</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={12}
                  maximumValue={24}
                  step={1}
                  value={editorFontSize}
                  onValueChange={(val) =>
                    dispatch(updateSetting({ key: 'editorFontSize', value: Math.round(val) }))
                  }
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.borderSecondary}
                  thumbTintColor="#FFFFFF"
                />
                <Text style={styles.sizeLg}>A</Text>
              </RNView>
            </RNView>
          </RNView>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(220).delay(90)}>
          <Text style={styles.sectionCapMargin}>{t('settings.sync.header')}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(240).delay(120)}
          layout={LinearTransition.springify().damping(20).stiffness(220)}
        >
          <RNView style={common.card}>
            <Pressable
              onPress={() => router.push('/settings/sync')}
              style={({ pressed }) => [styles.syncRow, pressed && styles.rowPressed]}
            >
              <RNView style={common.settingsRowLeft}>
                <RNView style={common.iconBox34}>
                  <RefreshCw size={17} color={colors.primary} strokeWidth={1.8} />
                </RNView>
                <Text style={styles.rowLabelSemiBold}>{t('settings.sync.linkAndSync')}</Text>
              </RNView>
              <ChevronRight size={16} color={colors.textMuted} />
            </Pressable>
          </RNView>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(220).delay(160)}>
          <Text style={styles.footer}>{t('settings.footer')}</Text>
        </Animated.View>
      </ScrollView>
    </RNView>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scroll: {
      paddingHorizontal: Space.lg,
      paddingBottom: 60,
      paddingTop: Space.md,
    },
    sectionCap: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      letterSpacing: LetterSpacing.caps,
      marginBottom: Space.md,
      textTransform: 'uppercase',
      color: theme.colors.textMuted,
    },
    sectionCapMargin: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      letterSpacing: LetterSpacing.caps,
      marginBottom: Space.md,
      marginTop: Space.xxxl,
      textTransform: 'uppercase',
      color: theme.colors.textMuted,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: Space.base,
      minHeight: 52,
    },
    rowUnderline: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: Space.base,
      minHeight: 52,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSecondary,
    },
    rowPressed: {
      backgroundColor: theme.colors.cardPressed,
    },
    rowLabel: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.medium,
      color: theme.colors.text,
    },
    rowLabelSemiBold: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    rowVal: {
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
    },
    segCtrl: {
      flexDirection: 'row',
      borderRadius: Radii.lg,
      padding: 3,
      backgroundColor: theme.colors.controlBackground,
    },
    segPill: {
      paddingHorizontal: Space.md,
      paddingVertical: 7,
      borderRadius: Radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segPillActive: {
      backgroundColor: theme.colors.primary,
    },
    radiusLeft: {
      borderTopLeftRadius: Radii.md,
      borderBottomLeftRadius: Radii.md,
    },
    radiusRight: {
      borderTopRightRadius: Radii.md,
      borderBottomRightRadius: Radii.md,
    },
    segText: {
      fontSize: FontSize.small,
      fontWeight: FontWeight.medium,
      color: theme.colors.textMuted,
    },
    segTextActive: {
      color: theme.colors.text,
      fontWeight: FontWeight.bold,
    },
    badge: {
      paddingHorizontal: Space.md,
      paddingVertical: Space.xs,
      borderRadius: Radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.cardSelected,
    },
    badgeText: {
      color: theme.colors.primary,
      fontSize: FontSize.small,
      fontWeight: FontWeight.bold,
    },
    footer: {
      textAlign: 'center',
      fontSize: FontSize.small,
      marginTop: Space.xxxl,
      fontStyle: 'italic',
      color: theme.colors.textMuted,
    },
    closeBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sliderRow: {
      flexDirection: 'column',
      alignItems: 'stretch',
      paddingVertical: Space.lg,
      paddingHorizontal: 18,
    },
    sliderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Space.base,
    },
    sliderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.md,
    },
    slider: {
      flex: 1,
    },
    sizeSm: {
      color: theme.colors.textMuted,
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
    },
    sizeLg: {
      color: theme.colors.textMuted,
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
    },
    syncRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 18,
      minHeight: 52,
    },
  })
