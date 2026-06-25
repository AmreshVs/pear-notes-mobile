import {
  getEditorFontSize,
  getFontFamily,
  getSortBy,
  getTheme,
  setTheme,
  updateSetting,
} from '@pear-notes/core/store/slices/settingsSlice.js'
import {
  deleteSyncedDevice,
  getSyncedDevices,
} from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import { clearStorage } from '@pear-notes/core/store/slices/syncSlice.js'
import Slider from '@react-native-community/slider'
import { router, Stack } from 'expo-router'
import { ChevronRight, Download, RefreshCw, Trash2, X } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionSheetIOS, Pressable, View as RNView, ScrollView, StyleSheet } from 'react-native'
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated'
import { useDispatch, useSelector } from 'react-redux'

import { ResetAppBottomSheet } from '@/components/bottomsheet/ResetAppBottomSheet'
import { Text, createThemedStylesheet, useTheme } from '@/components/Themed'
import {
  FontWeight,
  Durations,
  commonStyles,
  UI_SIZE_3,
  UI_SIZE_4,
  UI_SIZE_7,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_15,
  UI_SIZE_16,
  UI_SIZE_18,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_30,
  UI_SIZE_40,
  UI_SIZE_60,
  UI_FONT_SIZE_11,
  UI_FONT_SIZE_12,
  UI_FONT_SIZE_14,
  UI_FONT_SIZE_16,
  UI_FONT_SIZE_17,
  UI_FONT_SIZE_24,
  UI_ICON_SIZE_15,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_17,
  UI_STROKE_WIDTH_1_8,
  UI_STROKE_WIDTH_2_5,
} from '@/constants/commonStyles'
import { deleteDbEncryptionKey } from '@/lib/secureStore'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'

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
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const dispatch = useDispatch()

  const currentTheme = useSelector(getTheme)
  const fontFamily = useSelector(getFontFamily)
  const editorFontSize = useSelector(getEditorFontSize)
  const sortBy = useSelector(getSortBy)
  const syncedDevices = useSelector(getSyncedDevices)
  const localDevice = syncedDevices.find((d: any) => d.isLocal)
  const localDeviceKey = localDevice?.key

  const [resetSheetVisible, setResetSheetVisible] = useState(false)

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
      GET_SORT_OPTIONS(t),
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
      GET_FONT_OPTIONS(t),
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

  const handleResetCancel = useCallback(() => {
    setResetSheetVisible(false)
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
                  {GET_SORT_OPTIONS(t).find((o) => o.value === sortBy)?.label ??
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
                  {GET_FONT_OPTIONS(t).find((o) => o.value === fontFamily)?.label ?? fontFamily}
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
                  minimumValue={UI_FONT_SIZE_12}
                  maximumValue={UI_FONT_SIZE_24}
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
          <Text style={styles.sectionCapMargin}>{t('settings.danger.header')}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(Durations.slide).delay(Durations.delayReset)}
          layout={LinearTransition.springify().damping(20).stiffness(220)}
        >
          <RNView style={commonThemedStyles.card}>
            <Pressable
              onPress={handleResetPress}
              style={({ pressed }) => [commonStyles.settingsRow, pressed && commonStyles.pressed]}
            >
              <RNView style={commonStyles.settingsRowLeft}>
                <RNView style={[commonThemedStyles.iconBox34, styles.dangerIconBox]}>
                  <Trash2
                    size={UI_ICON_SIZE_17}
                    color={colors.error}
                    strokeWidth={UI_STROKE_WIDTH_1_8}
                  />
                </RNView>
                <Text style={[styles.rowLabelSemiBold, styles.dangerLabel]}>
                  {t('settings.danger.resetApp')}
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

      <ResetAppBottomSheet
        visible={resetSheetVisible}
        onConfirm={handleResetConfirm}
        onCancel={handleResetCancel}
      />
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
      fontSize: UI_FONT_SIZE_11,
      fontWeight: FontWeight.bold,
      letterSpacing: 1.5,
      marginBottom: UI_SIZE_12,
      textTransform: 'uppercase',
      color: theme.colors.textMuted,
    },
    sectionCapMargin: {
      fontSize: UI_FONT_SIZE_11,
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
      fontSize: UI_FONT_SIZE_16,
      fontWeight: FontWeight.medium,
      color: theme.colors.text,
    },
    rowLabelSemiBold: {
      fontSize: UI_FONT_SIZE_16,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    rowVal: {
      fontSize: UI_FONT_SIZE_14,
      color: theme.colors.textMuted,
    },
    segCtrl: {
      ...commonStyles.row,
      borderRadius: UI_SIZE_16,
      padding: UI_SIZE_3,
      backgroundColor: theme.colors.controlBackground,
    },
    segPill: {
      ...commonStyles.centered,
      paddingHorizontal: UI_SIZE_12,
      paddingVertical: UI_SIZE_7,
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
      fontSize: UI_FONT_SIZE_12,
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
      fontSize: UI_FONT_SIZE_12,
      fontWeight: FontWeight.bold,
    },
    footer: {
      textAlign: 'center',
      fontSize: UI_FONT_SIZE_12,
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
      fontSize: UI_FONT_SIZE_11,
      fontWeight: FontWeight.semibold,
    },
    sizeLg: {
      color: theme.colors.textMuted,
      fontSize: UI_FONT_SIZE_17,
      fontWeight: FontWeight.semibold,
    },
    dangerIconBox: {
      backgroundColor: `${theme.colors.error}1A`,
    },
    dangerLabel: {
      color: theme.colors.error,
    },
  })

  return styles
})
