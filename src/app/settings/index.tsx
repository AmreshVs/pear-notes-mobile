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

import { Text, Theme, useThemedStyles, useTheme } from '@/components/Themed'

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
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
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

        <RNView style={styles.card}>
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
            <RNView style={styles.rowRight}>
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
            <RNView style={styles.rowRight}>
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

        <RNView style={styles.card}>
          <Pressable
            onPress={() => router.push('/settings/sync')}
            style={({ pressed }) => [styles.syncRow, pressed && styles.rowPressed]}
          >
            <RNView style={styles.rowLeft}>
              <RNView style={styles.iconBox}>
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
      paddingHorizontal: 20,
      paddingBottom: 60,
      paddingTop: 12,
    },
    sectionCap: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      marginBottom: 10,
      textTransform: 'uppercase',
      color: theme.colors.textMuted,
    },
    sectionCapMargin: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      marginBottom: 10,
      textTransform: 'uppercase',
      color: theme.colors.textMuted,
      marginTop: 36,
    },
    card: {
      borderRadius: 18,
      borderWidth: 1,
      overflow: 'hidden',
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
      borderColor: theme.colors.borderSecondary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 16,
      minHeight: 52,
    },
    rowUnderline: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 16,
      minHeight: 52,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSecondary,
    },
    rowPressed: {
      backgroundColor: theme.colors.cardPressed,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    rowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    rowLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text,
    },
    rowLabelSemiBold: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    rowVal: {
      fontSize: 14,
      color: theme.colors.textMuted,
    },
    segCtrl: {
      flexDirection: 'row',
      borderRadius: 9,
      padding: 2,
      backgroundColor: theme.colors.controlBackground,
    },
    segPill: {
      paddingHorizontal: 12,
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
      borderTopLeftRadius: 8,
      borderBottomLeftRadius: 8,
    },
    radiusRight: {
      borderTopRightRadius: 8,
      borderBottomRightRadius: 8,
    },
    segText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.textMuted,
    },
    segTextActive: {
      color: theme.isDark ? '#000000' : '#ffffff',
      fontWeight: '700',
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.cardSelected,
    },
    badgeText: {
      color: theme.colors.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    iconBox: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.cardSelected,
    },
    footer: {
      textAlign: 'center',
      fontSize: 13,
      marginTop: 40,
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
    pressed: {
      opacity: 0.6,
    },
    sliderRow: {
      flexDirection: 'column',
      alignItems: 'stretch',
      paddingVertical: 20,
      paddingHorizontal: 18,
    },
    sliderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sliderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    slider: {
      flex: 1,
    },
    sizeSm: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    sizeLg: {
      color: theme.colors.textMuted,
      fontSize: 17,
      fontWeight: '600',
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
