import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, View as RNView } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { router } from 'expo-router'
import { Check } from 'lucide-react-native'

import { getFontFamily, updateSetting } from '@pear-notes/core/store/slices/settingsSlice.js'

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

  const renderOption = useCallback(
    (option: { label: string; value: string }, index: number) => {
      const selected = option.value === fontFamily
      return (
        <Pressable
          key={option.value}
          onPress={() => handleSelect(option.value)}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          accessibilityLabel={option.label}
          style={({ pressed }) => [
            index < options.length - 1 ? styles.rowUnderline : styles.row,
            pressed && commonStyles.pressed,
          ]}
        >
          <Text style={styles.rowLabel}>{option.label}</Text>
          {selected && <Check size={UI_ICON_SIZE_20} color={colors.primary} />}
        </Pressable>
      )
    },
    [fontFamily, handleSelect, options.length, styles, colors.primary],
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
      paddingHorizontal: Space.base,
      paddingVertical: Space.md,
    },
    rowUnderline: {
      ...commonStyles.row,
      justifyContent: 'space-between',
      minHeight: UI_SIZE_44,
      paddingHorizontal: Space.base,
      paddingVertical: Space.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSecondary,
    },
    rowLabel: {
      fontSize: FontSize.subtitle,
      color: theme.colors.text,
    },
  })
  return styles
})
