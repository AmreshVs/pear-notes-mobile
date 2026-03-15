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

import { Text, useTheme } from '@/components/Themed'

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
  const { isDark, colors } = useTheme()
  const dispatch = useDispatch()

  const theme = useSelector(getTheme)
  const fontFamily = useSelector(getFontFamily)
  const editorFontSize = useSelector(getEditorFontSize)
  const sortBy = useSelector(getSortBy)

  const pageBg = colors.background
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)'
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const rowSep = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const text = colors.text
  const textMuted = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)'
  const segBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'

  return (
    <RNView style={{ flex: 1, backgroundColor: pageBg }}>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerRight: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <X size={14} color={text} strokeWidth={2.5} />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionCap, { color: textMuted }]}>GENERAL</Text>

        <RNView style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <RNView style={[styles.row, { borderBottomWidth: 1, borderBottomColor: rowSep }]}>
            <Text style={[styles.rowLabel, { color: text }]}>App Theme</Text>
            <RNView style={[styles.segCtrl, { backgroundColor: segBg }]}>
              {(['system', 'light', 'dark'] as const).map((t, i) => {
                const isActive = theme === t
                return (
                  <Pressable
                    key={t}
                    onPress={() => dispatch(setTheme(t))}
                    style={[
                      styles.segPill,
                      isActive && {
                        backgroundColor: colors.primary,
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.4,
                        shadowRadius: 5,
                        elevation: 3,
                      },
                      i === 0 && { borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
                      i === 2 && { borderTopRightRadius: 8, borderBottomRightRadius: 8 },
                    ]}
                  >
                    <Text
                      style={{
                        color: isActive ? '#000000' : textMuted,
                        fontSize: 12,
                        fontWeight: isActive ? '700' : '500',
                      }}
                    >
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
            style={({ pressed }) => [
              styles.row,
              { borderBottomWidth: 1, borderBottomColor: rowSep },
              pressed && {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              },
            ]}
          >
            <Text style={[styles.rowLabel, { color: text }]}>Sort Notes By</Text>
            <RNView style={styles.rowRight}>
              <Text style={[styles.rowVal, { color: textMuted }]}>
                {SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Date Edited'}
              </Text>
              <ChevronRight size={15} color={textMuted} />
            </RNView>
          </Pressable>

          <Pressable
            onPress={() =>
              showPicker('Font Family', FONT_OPTIONS, (val) =>
                dispatch(updateSetting({ key: 'fontFamily', value: val })),
              )
            }
            style={({ pressed }) => [
              styles.row,
              { borderBottomWidth: 1, borderBottomColor: rowSep },
              pressed && {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              },
            ]}
          >
            <Text style={[styles.rowLabel, { color: text }]}>Font Family</Text>
            <RNView style={styles.rowRight}>
              <Text style={[styles.rowVal, { color: textMuted }]}>
                {FONT_OPTIONS.find((o) => o.value === fontFamily)?.label ?? fontFamily}
              </Text>
              <ChevronRight size={15} color={textMuted} />
            </RNView>
          </Pressable>

          <RNView
            style={[
              styles.row,
              { flexDirection: 'column', alignItems: 'stretch', paddingVertical: 20 },
            ]}
          >
            <RNView
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Text style={[styles.rowLabel, { color: text }]}>Text Size</Text>
              <RNView
                style={[
                  styles.badge,
                  { backgroundColor: isDark ? 'rgba(220,163,35,0.15)' : 'rgba(220,163,35,0.12)' },
                ]}
              >
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>
                  {editorFontSize}
                </Text>
              </RNView>
            </RNView>
            <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ color: textMuted, fontSize: 11, fontWeight: '600' }}>A</Text>
              <Slider
                style={{ flex: 1 }}
                minimumValue={12}
                maximumValue={24}
                step={1}
                value={editorFontSize}
                onValueChange={(val) =>
                  dispatch(updateSetting({ key: 'editorFontSize', value: Math.round(val) }))
                }
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}
                thumbTintColor={isDark ? '#FFFFFF' : '#FFFFFF'}
              />
              <Text style={{ color: textMuted, fontSize: 17, fontWeight: '600' }}>A</Text>
            </RNView>
          </RNView>
        </RNView>

        <Text style={[styles.sectionCap, { color: textMuted, marginTop: 36 }]}>SYNC & DEVICES</Text>

        <RNView style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Pressable
            onPress={() => router.push('/settings/sync')}
            style={({ pressed }) => [
              styles.row,
              { paddingVertical: 18 },
              pressed && {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              },
            ]}
          >
            <RNView style={styles.rowLeft}>
              <RNView
                style={[
                  styles.iconBox,
                  { backgroundColor: isDark ? 'rgba(220,163,35,0.15)' : 'rgba(220,163,35,0.1)' },
                ]}
              >
                <RefreshCw size={17} color={colors.primary} strokeWidth={1.8} />
              </RNView>
              <Text style={[styles.rowLabel, { color: text, fontWeight: '600' }]}>
                Link and Sync
              </Text>
            </RNView>
            <ChevronRight size={16} color={textMuted} />
          </Pressable>
        </RNView>

        <Text style={[styles.footer, { color: textMuted }]}>
          End-to-end encrypted • Fully private
        </Text>
      </ScrollView>
    </RNView>
  )
}

const styles = StyleSheet.create({
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
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    minHeight: 52,
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
  },
  rowVal: {
    fontSize: 14,
  },
  segCtrl: {
    flexDirection: 'row',
    borderRadius: 9,
    padding: 2,
  },
  segPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    textAlign: 'center',
    fontSize: 13,
    marginTop: 40,
    fontStyle: 'italic',
  },
})
