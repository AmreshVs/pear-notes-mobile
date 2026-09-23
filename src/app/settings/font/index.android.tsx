import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router, Stack } from 'expo-router'

import { getFontFamily, updateSetting } from '@pear-notes/core/store/slices/settingsSlice.js'

import { AndroidSettingsAppBar } from '@/components/android/AndroidSettingsAppBar'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  UI_ICON_SIZE_20,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_28,
  UI_SIZE_40,
  UI_SIZE_56,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import { hapticSelection } from '@/lib/haptics'
import { getFontPreviewVariant } from '@/utils/fontPreview'
import { getFontOptions } from '@/utils/settingsUtils'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  onSurfaceVariant?: string
}

export default function AndroidFontFamilyScreen() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const theme = useTheme()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const fontFamily = useSelector(getFontFamily) as string

  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const options = getFontOptions(t)

  const previewStyles = useMemo(
    () => ({ sans: styles.previewSans, serif: styles.previewSerif, mono: styles.previewMono }),
    [styles.previewSans, styles.previewSerif, styles.previewMono],
  )

  const handleSelect = useCallback(
    (value: string) => {
      hapticSelection()
      dispatch(updateSetting({ key: 'fontFamily', value }))
      router.back()
    },
    [dispatch],
  )

  const renderOption = useCallback(
    (option: { label: string; value: string }, index: number) => {
      const selected = option.value === fontFamily
      return (
        <Pressable
          key={option.value}
          onPress={() => handleSelect(option.value)}
          android_ripple={ripple}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          accessibilityLabel={option.label}
          style={index < options.length - 1 ? styles.rowDivider : styles.row}
        >
          <Text style={[styles.rowLabel, previewStyles[getFontPreviewVariant(option.value)]]}>
            {option.label}
          </Text>
          {selected && (
            <MaterialCommunityIcons name="check" size={UI_ICON_SIZE_20} color={c.primary} />
          )}
        </Pressable>
      )
    },
    [fontFamily, handleSelect, options.length, ripple, styles, previewStyles, c.primary],
  )

  return (
    <View style={styles.root}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <Stack.Screen options={{ headerShown: false }} />

      <AndroidSettingsAppBar title={t('settings.general.fontFamily')} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>{options.map(renderOption)}</View>
      </ScrollView>
    </View>
  )
}

const useFontScreenHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks((_theme, { md3, insets }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    root: {
      ...commonStyles.flex1,
      backgroundColor: c.background,
    },
    scrollContent: {
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: insets.bottom + UI_SIZE_40,
    },
    card: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      overflow: 'hidden',
    },
    row: {
      ...commonStyles.row,
      justifyContent: 'space-between',
      minHeight: UI_SIZE_56,
      paddingHorizontal: UI_SIZE_20,
      paddingVertical: UI_SIZE_16,
    },
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      ...commonStyles.row,
      justifyContent: 'space-between',
      minHeight: UI_SIZE_56,
      marginHorizontal: UI_SIZE_20,
      paddingVertical: UI_SIZE_16,
      borderBottomColor: hexWithAlpha(c.onSurface, 0.12),
    },
    rowLabel: {
      fontSize: FontSize.subtitle,
      color: c.onSurface,
    },
    previewSans: {
      fontFamily: 'sans-serif',
    },
    previewSerif: {
      fontFamily: 'serif',
    },
    previewMono: {
      fontFamily: 'monospace',
    },
  })
  return styles
}, useFontScreenHooks)
