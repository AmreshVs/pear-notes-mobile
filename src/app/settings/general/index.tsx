import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, Switch, View as RNView } from 'react-native'
import { Easing, FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated'
import { useDispatch, useSelector } from 'react-redux'
import Slider from '@react-native-community/slider'
import { router, Stack } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'

import {
  getEditorFontSize,
  getFontFamily,
  getSortBy,
  getTheme,
  setTheme,
  updateSetting,
} from '@pear-notes/core/store/slices/settingsSlice.js'

import { MotionView } from '@/components/MotionView'
import { BackgroundSyncSection } from '@/components/settings/BackgroundSyncSection'
import { MediaSyncSection } from '@/components/settings/MediaSyncSection'
import { useHapticsPreference } from '@/components/settings/useHapticsPreference'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  Durations,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_15,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_18,
  UI_SIZE_20,
  UI_SIZE_60,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { hapticSelection } from '@/lib/haptics'
import { getFontOptions, getSortOptions, showPicker } from '@/utils/settingsUtils'

export default function GeneralSettingsScreen() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const dispatch = useDispatch()

  const currentTheme = useSelector(getTheme)
  const fontFamily = useSelector(getFontFamily)
  const editorFontSize = useSelector(getEditorFontSize)
  const sortBy = useSelector(getSortBy)
  const { hapticsEnabled, toggleHaptics } = useHapticsPreference()

  const trackColor = useMemo(
    () => ({ false: colors.controlBackground, true: colors.primary }),
    [colors.controlBackground, colors.primary],
  )

  const handleThemeSelect = useCallback(
    (themeKey: 'system' | 'light' | 'dark') => {
      hapticSelection()
      dispatch(setTheme(themeKey))
    },
    [dispatch],
  )

  const handleSortSelect = useCallback(
    (val: string) => {
      hapticSelection()
      dispatch(updateSetting({ key: 'sortBy', value: val }))
    },
    [dispatch],
  )

  const handleSortNotesPress = useCallback(() => {
    showPicker(
      t('settings.general.sortNotesBy'),
      getSortOptions(t),
      sortBy,
      handleSortSelect,
      t('common.cancel'),
    )
  }, [t, handleSortSelect, sortBy])

  const handleFontFamilyPress = useCallback(() => {
    router.push('/settings/font' as any)
  }, [])

  const handleFontSizeChange = useCallback(
    (val: number) => {
      dispatch(updateSetting({ key: 'editorFontSize', value: Math.round(val) }))
    },
    [dispatch],
  )

  return (
    <RNView style={commonThemedStyles.screenContainer}>
      <Stack.Screen options={{ title: t('layouts.general') }} />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <MotionView entering={FadeIn.duration(Durations.fade)}>
          <Text style={commonThemedStyles.settingsSectionCap}>
            {t('settings.general.interface')}
          </Text>
        </MotionView>

        <MotionView
          entering={FadeInDown.duration(Durations.slide).delay(Durations.delayShort)}
          layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
        >
          <RNView style={commonThemedStyles.card}>
            <RNView style={styles.stackedRowUnderline}>
              <Text style={styles.rowLabel}>{t('settings.general.appTheme')}</Text>
              <RNView style={styles.segCtrl}>
                {(['system', 'light', 'dark'] as const).map((themeKey, i) => {
                  const isActive = currentTheme === themeKey
                  return (
                    <Pressable
                      key={themeKey}
                      onPress={() => handleThemeSelect(themeKey)}
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

            <RNView style={styles.toggleRow}>
              <RNView style={styles.toggleInfo}>
                <Text style={styles.rowLabel}>{t('settings.general.hapticFeedback')}</Text>
                <Text style={styles.rowDesc}>{t('settings.general.hapticFeedbackDesc')}</Text>
              </RNView>
              <Switch
                value={hapticsEnabled}
                onValueChange={toggleHaptics}
                trackColor={trackColor}
                thumbColor={colors.white}
              />
            </RNView>
          </RNView>
        </MotionView>

        <MotionView entering={FadeIn.duration(Durations.fade).delay(Durations.delayMedium)}>
          <Text style={commonThemedStyles.settingsSectionCapSpaced}>
            {t('settings.general.notesList')}
          </Text>
        </MotionView>

        <MotionView
          entering={FadeInDown.duration(Durations.slide).delay(Durations.delayMedium)}
          layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
        >
          <RNView style={commonThemedStyles.card}>
            <Pressable
              onPress={handleSortNotesPress}
              style={({ pressed }) => [commonStyles.settingsRow, pressed && commonStyles.pressed]}
            >
              <Text style={styles.rowLabel}>{t('settings.general.sortNotesBy')}</Text>
              <RNView style={commonStyles.settingsRowRight}>
                <Text style={styles.rowVal}>
                  {getSortOptions(t).find((o) => o.value === sortBy)?.label ??
                    t('settings.general.sortOptions.updatedAt')}
                </Text>
                <ChevronRight size={UI_ICON_SIZE_15} color={colors.textMuted} />
              </RNView>
            </Pressable>
          </RNView>
        </MotionView>

        <MotionView entering={FadeIn.duration(Durations.fade).delay(Durations.delayLong)}>
          <Text style={commonThemedStyles.settingsSectionCapSpaced}>
            {t('settings.general.editor')}
          </Text>
        </MotionView>

        <MotionView
          entering={FadeInDown.duration(Durations.slide).delay(Durations.delayLong)}
          layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
        >
          <RNView style={commonThemedStyles.card}>
            <Pressable
              onPress={handleFontFamilyPress}
              style={({ pressed }) => [styles.rowUnderline, pressed && commonStyles.pressed]}
            >
              <Text style={styles.rowLabel}>{t('settings.general.fontFamily')}</Text>
              <RNView style={commonStyles.settingsRowRight}>
                <Text style={styles.rowVal}>
                  {getFontOptions(t).find((o) => o.value === fontFamily)?.label ?? fontFamily}
                </Text>
                <ChevronRight size={UI_ICON_SIZE_15} color={colors.textMuted} />
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
                  minimumValue={FontSize.caption}
                  maximumValue={FontSize.heading}
                  step={1}
                  value={editorFontSize}
                  onValueChange={handleFontSizeChange}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.borderSecondary}
                  thumbTintColor={colors.white}
                />
                <Text style={styles.sizeLg}>A</Text>
              </RNView>
            </RNView>
          </RNView>
        </MotionView>

        <BackgroundSyncSection />

        <MediaSyncSection />
      </ScrollView>
    </RNView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    scroll: {
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: UI_SIZE_60,
      paddingTop: UI_SIZE_12,
    },
    rowUnderline: {
      ...commonStyles.settingsRow,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSecondary,
    },
    rowLabel: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.medium,
      color: theme.colors.text,
    },
    rowVal: {
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
    },
    stackedRowUnderline: {
      paddingHorizontal: UI_SIZE_18,
      paddingVertical: Space.base,
      gap: Space.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSecondary,
    },
    toggleRow: {
      ...commonStyles.rowBetween,
      paddingHorizontal: UI_SIZE_18,
      paddingVertical: Space.base,
      gap: Space.md,
    },
    toggleInfo: {
      ...commonStyles.flex1,
      gap: UI_SIZE_4,
    },
    rowDesc: {
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
    },
    segCtrl: {
      ...commonStyles.row,
      borderRadius: UI_SIZE_16,
      padding: 3,
      backgroundColor: theme.colors.controlBackground,
    },
    segPill: {
      ...commonStyles.flex1,
      ...commonStyles.centered,
      paddingHorizontal: UI_SIZE_12,
      paddingVertical: 7,
      borderRadius: UI_SIZE_12,
    },
    segPillActive: {
      backgroundColor: theme.colors.primary,
    },
    radiusLeft: {
      borderTopLeftRadius: UI_SIZE_12,
      borderBottomLeftRadius: UI_SIZE_12,
    },
    radiusRight: {
      borderTopRightRadius: UI_SIZE_12,
      borderBottomRightRadius: UI_SIZE_12,
    },
    segText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.medium,
      color: theme.colors.textMuted,
    },
    segTextActive: {
      color: theme.colors.onPrimary,
      fontWeight: FontWeight.bold,
    },
    badge: {
      paddingHorizontal: UI_SIZE_12,
      paddingVertical: UI_SIZE_4,
      borderRadius: UI_SIZE_8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.cardSelected,
    },
    badgeText: {
      color: theme.colors.primary,
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
    },
    sliderRow: {
      flexDirection: 'column',
      alignItems: 'stretch',
      paddingVertical: UI_SIZE_20,
      paddingHorizontal: UI_SIZE_18,
    },
    sliderHeader: {
      ...commonStyles.rowBetween,
      marginBottom: UI_SIZE_16,
    },
    sliderContainer: {
      ...commonStyles.row,
      gap: UI_SIZE_12,
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
  })

  return styles
})
