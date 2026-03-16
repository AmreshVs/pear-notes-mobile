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
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  View as RNView,
  ScrollView,
  StyleSheet,
} from 'react-native'
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

function showPicker(
  title: string,
  options: { label: string; value: string }[],
  onSelect: (value: string) => void,
) {
  if (Platform.OS === 'ios') {
    const labels = [...options.map((o) => o.label), 'Cancel']
    ActionSheetIOS.showActionSheetWithOptions(
      { options: labels, cancelButtonIndex: labels.length - 1, title },
      (index) => {
        if (index < options.length) onSelect(options[index].value)
      },
    )
  } else {
    Alert.alert(title, undefined, [
      ...options.map((o) => ({ text: o.label, onPress: () => onSelect(o.value) })),
      { text: 'Cancel', style: 'cancel' },
    ])
  }
}

export default function SettingsScreen() {
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
          title: 'Settings',
          headerRight: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              style={({ pressed }) => [styles.closeBtn, pressed && common.pressed]}
            >
              <X size={14} color={colors.text} strokeWidth={2.5} />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionCap}>GENERAL</Text>

        <RNView style={common.card}>
          <RNView style={styles.rowUnderline}>
            <Text style={styles.rowLabel}>App Theme</Text>
            <RNView style={styles.segCtrl}>
              {(['system', 'light', 'dark'] as const).map((t, i) => {
                const isActive = currentTheme === t
                return (
                  <Pressable
                    key={t}
                    onPress={() => dispatch(setTheme(t))}
                    style={[
                      styles.segPill,
                      isActive && styles.segPillActive,
                      i === 0 && styles.radiusLeft,
                      i === 2 && styles.radiusRight,
                    ]}
                  >
                    <Text style={[styles.segText, isActive && styles.segTextActive]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </Pressable>
                )
              })}
            </RNView>
          </RNView>

          <Pressable
            onPress={() =>
              showPicker('Sort Notes By', SORT_OPTIONS, (val) =>
                dispatch(updateSetting({ key: 'sortBy', value: val })),
              )
            }
            style={({ pressed }) => [styles.rowUnderline, pressed && styles.rowPressed]}
          >
            <Text style={styles.rowLabel}>Sort Notes By</Text>
            <RNView style={common.settingsRowRight}>
              <Text style={styles.rowVal}>
                {SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Date Edited'}
              </Text>
              <ChevronRight size={15} color={colors.textMuted} />
            </RNView>
          </Pressable>

          <Pressable
            onPress={() =>
              showPicker('Font Family', FONT_OPTIONS, (val) =>
                dispatch(updateSetting({ key: 'fontFamily', value: val })),
              )
            }
            style={({ pressed }) => [styles.rowUnderline, pressed && styles.rowPressed]}
          >
            <Text style={styles.rowLabel}>Font Family</Text>
            <RNView style={common.settingsRowRight}>
              <Text style={styles.rowVal}>
                {FONT_OPTIONS.find((o) => o.value === fontFamily)?.label ?? fontFamily}
              </Text>
              <ChevronRight size={15} color={colors.textMuted} />
            </RNView>
          </Pressable>

          <RNView style={styles.sliderRow}>
            <RNView style={styles.sliderHeader}>
              <Text style={styles.rowLabel}>Text Size</Text>
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

        <Text style={styles.sectionCapMargin}>SYNC & DEVICES</Text>

        <RNView style={common.card}>
          <Pressable
            onPress={() => router.push('/settings/sync')}
            style={({ pressed }) => [styles.syncRow, pressed && styles.rowPressed]}
          >
            <RNView style={common.settingsRowLeft}>
              <RNView style={common.iconBox34}>
                <RefreshCw size={17} color={colors.primary} strokeWidth={1.8} />
              </RNView>
              <Text style={styles.rowLabelSemiBold}>Link and Sync</Text>
            </RNView>
            <ChevronRight size={16} color={colors.textMuted} />
          </Pressable>
        </RNView>

        <Text style={styles.footer}>End-to-end encrypted • Fully private</Text>
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
      borderRadius: 9,
      padding: 2,
      backgroundColor: theme.colors.controlBackground,
    },
    segPill: {
      paddingHorizontal: Space.md,
      paddingVertical: 7,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segPillActive: {
      backgroundColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 5,
      elevation: 3,
    },
    radiusLeft: {
      borderTopLeftRadius: Radii.sm,
      borderBottomLeftRadius: Radii.sm,
    },
    radiusRight: {
      borderTopRightRadius: Radii.sm,
      borderBottomRightRadius: Radii.sm,
    },
    segText: {
      fontSize: FontSize.small,
      fontWeight: FontWeight.medium,
      color: theme.colors.textMuted,
    },
    segTextActive: {
      color: theme.isDark ? '#000000' : '#ffffff',
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
      backgroundColor: theme.colors.controlBackground,
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
