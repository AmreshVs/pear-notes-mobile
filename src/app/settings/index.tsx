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
import { ChevronRight, Database, Download, RefreshCw, X } from 'lucide-react-native'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, View as RNView, ScrollView, StyleSheet } from 'react-native'
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated'
import { useDispatch, useSelector } from 'react-redux'

import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  Durations,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_15,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_17,
  UI_SIZE_12,
  UI_SIZE_15,
  UI_SIZE_16,
  UI_SIZE_18,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_30,
  UI_SIZE_4,
  UI_SIZE_40,
  UI_SIZE_60,
  UI_SIZE_8,
  UI_STROKE_WIDTH_1_8,
  UI_STROKE_WIDTH_2_5,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { getFontOptions, getSortOptions, showPicker } from '@/utils/settingsUtils'

export default function SettingsScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { colors } = theme
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const dispatch = useDispatch()

  const currentTheme = useSelector(getTheme)
  const fontFamily = useSelector(getFontFamily)
  const editorFontSize = useSelector(getEditorFontSize)
  const sortBy = useSelector(getSortBy)

  const handleClose = useCallback(() => {
    router.back()
  }, [])

  const handleThemeSelect = useCallback(
    (themeKey: 'system' | 'light' | 'dark') => {
      dispatch(setTheme(themeKey))
    },
    [dispatch],
  )

  const handleSortSelect = useCallback(
    (val: string) => {
      dispatch(updateSetting({ key: 'sortBy', value: val }))
    },
    [dispatch],
  )

  const handleSortNotesPress = useCallback(() => {
    showPicker(
      t('settings.general.sortNotesBy'),
      getSortOptions(t),
      handleSortSelect,
      t('common.cancel'),
    )
  }, [t, handleSortSelect])

  const handleFontSelect = useCallback(
    (val: string) => {
      dispatch(updateSetting({ key: 'fontFamily', value: val }))
    },
    [dispatch],
  )

  const handleFontFamilyPress = useCallback(() => {
    showPicker(
      t('settings.general.fontFamily'),
      getFontOptions(t),
      handleFontSelect,
      t('common.cancel'),
    )
  }, [t, handleFontSelect])

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

  const handleStoragePress = useCallback(() => {
    router.push('/settings/storage' as any)
  }, [])

  return (
    <RNView style={commonThemedStyles.screenContainer}>
      <Stack.Screen
        options={{
          title: t('settings.title'),
          headerRight: () => (
            <Pressable
              onPress={handleClose}
              hitSlop={8}
              style={({ pressed }) => [styles.closeBtn, pressed && commonStyles.pressed]}
            >
              <X size={UI_ICON_SIZE_16} color={colors.text} strokeWidth={UI_STROKE_WIDTH_2_5} />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(Durations.fade)}>
          <Text style={styles.sectionCap}>{t('settings.general.header')}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(Durations.slide).delay(Durations.delayShort)}
          layout={LinearTransition.springify().damping(20).stiffness(220)}
        >
          <RNView style={commonThemedStyles.card}>
            <RNView style={styles.rowUnderline}>
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

            <Pressable
              onPress={handleSortNotesPress}
              style={({ pressed }) => [styles.rowUnderline, pressed && commonStyles.pressed]}
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
        </Animated.View>

        <Animated.View entering={FadeIn.duration(Durations.fade).delay(Durations.delayMedium)}>
          <Text style={styles.sectionCapMargin}>{t('settings.sync.header')}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(Durations.slide).delay(Durations.delayLong)}
          layout={LinearTransition.springify().damping(20).stiffness(220)}
        >
          <RNView style={commonThemedStyles.card}>
            <Pressable
              onPress={handleSyncPress}
              style={({ pressed }) => [commonStyles.settingsRow, pressed && commonStyles.pressed]}
            >
              <RNView style={commonStyles.settingsRowLeft}>
                <RNView style={commonThemedStyles.iconBox34}>
                  <RefreshCw
                    size={UI_ICON_SIZE_17}
                    color={colors.primary}
                    strokeWidth={UI_STROKE_WIDTH_1_8}
                  />
                </RNView>
                <Text style={styles.rowLabelSemiBold}>{t('settings.sync.linkAndSync')}</Text>
              </RNView>
              <ChevronRight size={UI_ICON_SIZE_16} color={colors.textMuted} />
            </Pressable>
          </RNView>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(Durations.fade).delay(Durations.delayExtraLong)}>
          <Text style={styles.sectionCapMargin}>{t('settings.backup.header')}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(Durations.slide).delay(Durations.delayExtraLong)}
          layout={LinearTransition.springify().damping(20).stiffness(220)}
        >
          <RNView style={commonThemedStyles.card}>
            <Pressable
              onPress={handleBackupPress}
              style={({ pressed }) => [commonStyles.settingsRow, pressed && commonStyles.pressed]}
            >
              <RNView style={commonStyles.settingsRowLeft}>
                <RNView style={commonThemedStyles.iconBox34}>
                  <Download
                    size={UI_ICON_SIZE_17}
                    color={colors.primary}
                    strokeWidth={UI_STROKE_WIDTH_1_8}
                  />
                </RNView>
                <Text style={styles.rowLabelSemiBold}>{t('settings.backup.backupAndRestore')}</Text>
              </RNView>
              <ChevronRight size={UI_ICON_SIZE_16} color={colors.textMuted} />
            </Pressable>
          </RNView>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(Durations.fade).delay(Durations.delayReset)}>
          <Text style={styles.sectionCapMargin}>{t('settings.storage.header')}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(Durations.slide).delay(Durations.delayReset)}
          layout={LinearTransition.springify().damping(20).stiffness(220)}
        >
          <RNView style={commonThemedStyles.card}>
            <Pressable
              onPress={handleStoragePress}
              style={({ pressed }) => [commonStyles.settingsRow, pressed && commonStyles.pressed]}
            >
              <RNView style={commonStyles.settingsRowLeft}>
                <RNView style={commonThemedStyles.iconBox34}>
                  <Database
                    size={UI_ICON_SIZE_17}
                    color={colors.primary}
                    strokeWidth={UI_STROKE_WIDTH_1_8}
                  />
                </RNView>
                <Text style={styles.rowLabelSemiBold}>
                  {t('settings.storage.storageTitle')}
                </Text>
              </RNView>
              <ChevronRight size={UI_ICON_SIZE_16} color={colors.textMuted} />
            </Pressable>
          </RNView>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(Durations.fade).delay(Durations.delayFooter)}>
          <Text style={styles.footer}>{t('settings.footer')}</Text>
        </Animated.View>
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
    sectionCap: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      letterSpacing: 1.5,
      marginBottom: UI_SIZE_12,
      textTransform: 'uppercase',
      color: theme.colors.textMuted,
    },
    sectionCapMargin: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      letterSpacing: 1.5,
      marginBottom: UI_SIZE_12,
      marginTop: UI_SIZE_24,
      textTransform: 'uppercase',
      color: theme.colors.textMuted,
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
    rowLabelSemiBold: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    rowVal: {
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
    },
    segCtrl: {
      ...commonStyles.row,
      borderRadius: UI_SIZE_16,
      padding: 3,
      backgroundColor: theme.colors.controlBackground,
    },
    segPill: {
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
      color: theme.colors.text,
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
    footer: {
      textAlign: 'center',
      fontSize: FontSize.caption,
      marginTop: UI_SIZE_40,
      fontStyle: 'italic',
      color: theme.colors.textMuted,
    },
    closeBtn: {
      ...commonStyles.centered,
      width: UI_SIZE_30,
      height: UI_SIZE_30,
      borderRadius: UI_SIZE_15,
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
