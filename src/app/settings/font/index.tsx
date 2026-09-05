import { Fragment, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform, Pressable, ScrollView, StyleSheet, View as RNView } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { router } from 'expo-router'

import { getFontFamily, updateSetting } from '@pear-notes/core/store/slices/settingsSlice.js'

import { Divider } from '@/components/Divider'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useColors } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  Space,
  UI_ICON_SIZE_20,
  UI_SIZE_44,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { hapticSelection } from '@/lib/haptics'
import { getFontPreviewVariant } from '@/utils/fontPreview'
import { getFontOptions } from '@/utils/settingsUtils'

export default function FontFamilyScreen() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const styles = useStyles()
  const colors = useColors()
  const commonThemedStyles = useCommonThemedStyles()
  const fontFamily = useSelector(getFontFamily) as string

  const options = getFontOptions(t)

  const handleSelect = useCallback(
    (value: string) => {
      hapticSelection()
      dispatch(updateSetting({ key: 'fontFamily', value }))
      router.back()
    },
    [dispatch],
  )

  const previewStyles = useMemo(
    () => ({ sans: styles.previewSans, serif: styles.previewSerif, mono: styles.previewMono }),
    [styles.previewSans, styles.previewSerif, styles.previewMono],
  )

  const renderOption = useCallback(
    (option: { label: string; value: string }, index: number) => {
      const selected = option.value === fontFamily
      return (
        <Fragment key={option.value}>
          <Pressable
            onPress={() => handleSelect(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            style={({ pressed }) => [styles.row, pressed && commonStyles.pressed]}
          >
            <Text style={[styles.rowLabel, previewStyles[getFontPreviewVariant(option.value)]]}>
              {option.label}
            </Text>
            {selected && (
              <SymbolIcon name="checkmark" size={UI_ICON_SIZE_20} color={colors.primary} />
            )}
          </Pressable>
          {index < options.length - 1 && (
            <RNView style={styles.dividerWrap}>
              <Divider />
            </RNView>
          )}
        </Fragment>
      )
    },
    [fontFamily, handleSelect, options.length, styles, colors.primary, previewStyles],
  )

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <RNView style={commonThemedStyles.card}>{options.map(renderOption)}</RNView>
    </ScrollView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    scroll: {
      paddingHorizontal: Space.lg,
      paddingTop: Space.md,
    },
    row: {
      ...commonStyles.row,
      justifyContent: 'space-between',
      minHeight: UI_SIZE_44,
      padding: Space.base,
    },
    dividerWrap: {
      marginHorizontal: Space.base,
    },
    rowLabel: {
      fontSize: FontSize.subtitle,
      color: theme.colors.text,
    },
    previewSans: {
      fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
    },
    previewSerif: {
      fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    },
    previewMono: {
      fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    },
  })
  return styles
})
