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
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActionSheetIOS,
  Modal,
  Pressable,
  View as RNView,
  ScrollView,
  StyleSheet,
} from 'react-native'
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'

import { GlassView } from '@/components/GlassView'
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
  const syncedDevices = useSelector(getSyncedDevices)
  const localDevice = syncedDevices.find((d: any) => d.isLocal)
  const localDeviceKey = localDevice?.key

  const [resetSheetVisible, setResetSheetVisible] = useState(false)

  const handleResetPress = () => {
    setResetSheetVisible(true)
  }

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

        <Animated.View entering={FadeIn.duration(220).delay(130)}>
          <Text style={styles.sectionCapMargin}>{t('settings.backup.header')}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(240).delay(150)}
          layout={LinearTransition.springify().damping(20).stiffness(220)}
        >
          <RNView style={common.card}>
            <Pressable
              onPress={() => router.push('/settings/backup' as any)}
              style={({ pressed }) => [styles.syncRow, pressed && styles.rowPressed]}
            >
              <RNView style={common.settingsRowLeft}>
                <RNView style={common.iconBox34}>
                  <Download size={17} color={colors.primary} strokeWidth={1.8} />
                </RNView>
                <Text style={styles.rowLabelSemiBold}>{t('settings.backup.backupAndRestore')}</Text>
              </RNView>
              <ChevronRight size={16} color={colors.textMuted} />
            </Pressable>
          </RNView>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(220).delay(180)}>
          <Text style={styles.sectionCapMargin}>{t('settings.danger.header')}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(240).delay(200)}
          layout={LinearTransition.springify().damping(20).stiffness(220)}
        >
          <RNView style={common.card}>
            <Pressable
              onPress={handleResetPress}
              style={({ pressed }) => [styles.syncRow, pressed && styles.rowPressed]}
            >
              <RNView style={common.settingsRowLeft}>
                <RNView style={[common.iconBox34, { backgroundColor: `${colors.error}1A` }]}>
                  <Trash2 size={17} color={colors.error} strokeWidth={1.8} />
                </RNView>
                <Text style={[styles.rowLabelSemiBold, { color: colors.error }]}>
                  {t('settings.danger.resetApp')}
                </Text>
              </RNView>
              <ChevronRight size={16} color={colors.textMuted} />
            </Pressable>
          </RNView>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(220).delay(220)}>
          <Text style={styles.footer}>{t('settings.footer')}</Text>
        </Animated.View>
      </ScrollView>

      <ResetBottomSheet
        visible={resetSheetVisible}
        onConfirm={() => {
          setResetSheetVisible(false)
          if (syncedDevices.length > 1 && localDeviceKey) {
            dispatch(deleteSyncedDevice({ key: localDeviceKey } as any))
          } else {
            dispatch(clearStorage())
          }
          router.back()
        }}
        onCancel={() => setResetSheetVisible(false)}
      />
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
      marginTop: Space.xl,
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

interface ResetBottomSheetProps {
  visible: boolean
  onConfirm: () => void
  onCancel: () => void
}

function ResetBottomSheet({ visible, onConfirm, onCancel }: ResetBottomSheetProps) {
  const { t } = useTranslation()
  const { isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const styles = useThemedStyles(createSheetStyles)

  const [isPresented, setIsPresented] = useState(visible)
  const sheetProgress = useSharedValue(visible ? 1 : 0)

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sheetProgress.value * 1,
  }))

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: (1 - sheetProgress.value) * 450,
      },
    ],
  }))

  const handleSheetShow = useCallback(() => {
    sheetProgress.value = withTiming(1, {
      duration: 340,
      easing: Easing.out(Easing.cubic),
    })
  }, [sheetProgress])

  useEffect(() => {
    if (visible) {
      sheetProgress.value = 0
      setIsPresented(true)
      return
    }

    sheetProgress.value = withTiming(
      0,
      {
        duration: 260,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(setIsPresented)(false)
        }
      },
    )
  }, [sheetProgress, visible])

  const handleCancel = useCallback(() => {
    sheetProgress.value = withTiming(
      0,
      {
        duration: 260,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(setIsPresented)(false)
          runOnJS(onCancel)()
        }
      },
    )
  }, [sheetProgress, onCancel])

  const handleConfirm = useCallback(() => {
    sheetProgress.value = withTiming(
      0,
      {
        duration: 260,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(setIsPresented)(false)
          runOnJS(onConfirm)()
        }
      },
    )
  }, [sheetProgress, onConfirm])

  if (!isPresented) return null

  const bottomInset = Math.max(insets.bottom, 16)

  return (
    <Modal
      visible={isPresented}
      transparent
      allowSwipeDismissal
      animationType="fade"
      onShow={handleSheetShow}
      onRequestClose={handleCancel}
    >
      <RNView style={styles.overlay} pointerEvents={visible ? 'box-none' : 'none'}>
        <Animated.View
          style={[styles.backdrop, backdropAnimatedStyle]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCancel} />
        </Animated.View>

        <Animated.View
          style={[styles.sheetWrap, sheetAnimatedStyle]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          {isDark ? (
            <GlassView intensity={10} borderRadius={34} style={styles.sheet}>
              <RNView style={styles.grabber} />
              <RNView style={styles.content}>
                <Text style={styles.title}>{t('settings.reset.confirmTitle')}</Text>
                <Text style={styles.subtitle}>{t('settings.reset.confirmMessage')}</Text>

                <RNView style={styles.buttonsContainer}>
                  <Pressable
                    onPress={handleConfirm}
                    style={({ pressed }) => [styles.confirmBtn, pressed && styles.btnPressed]}
                  >
                    <Text style={styles.confirmBtnText}>{t('settings.danger.resetApp')}</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleCancel}
                    style={({ pressed }) => [styles.cancelBtn, pressed && styles.btnPressed]}
                  >
                    <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                  </Pressable>
                </RNView>
              </RNView>
              <RNView style={{ height: bottomInset }} />
            </GlassView>
          ) : (
            <RNView style={[styles.sheet, styles.sheetLight]}>
              <RNView style={styles.grabber} />
              <RNView style={styles.content}>
                <Text style={styles.title}>{t('settings.reset.confirmTitle')}</Text>
                <Text style={styles.subtitle}>{t('settings.reset.confirmMessage')}</Text>

                <RNView style={styles.buttonsContainer}>
                  <Pressable
                    onPress={handleConfirm}
                    style={({ pressed }) => [styles.confirmBtn, pressed && styles.btnPressed]}
                  >
                    <Text style={styles.confirmBtnText}>{t('settings.danger.resetApp')}</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleCancel}
                    style={({ pressed }) => [styles.cancelBtn, pressed && styles.btnPressed]}
                  >
                    <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                  </Pressable>
                </RNView>
              </RNView>
              <RNView style={{ height: bottomInset }} />
            </RNView>
          )}
        </Animated.View>
      </RNView>
    </Modal>
  )
}

const createSheetStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.38)',
    },
    sheetWrap: {
      justifyContent: 'flex-end',
      paddingHorizontal: 0,
    },
    sheet: {
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 4,
      gap: 18,
      borderCurve: 'continuous',
      borderTopLeftRadius: 34,
      borderTopRightRadius: 34,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      boxShadow: theme.isDark ? '0 -10px 32px rgba(0,0,0,0.45)' : '0 -12px 40px rgba(0,0,0,0.22)',
    },
    sheetLight: {
      backgroundColor: '#f2f2f7',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(0,0,0,0.14)',
    },
    grabber: {
      alignSelf: 'center',
      width: 38,
      height: 5,
      borderRadius: 999,
      backgroundColor: theme.isDark ? theme.colors.border : 'rgba(0,0,0,0.2)',
      marginBottom: 8,
    },
    content: {
      gap: 16,
      alignItems: 'center',
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 12,
    },
    buttonsContainer: {
      width: '100%',
      gap: 12,
      marginTop: 8,
    },
    confirmBtn: {
      height: 54,
      borderRadius: 27,
      backgroundColor: theme.colors.error,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },
    cancelBtn: {
      height: 54,
      borderRadius: 27,
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
      borderWidth: 1,
      borderColor: theme.colors.borderSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    btnPressed: {
      opacity: 0.7,
    },
  })
