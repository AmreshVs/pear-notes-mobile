import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated from 'react-native-reanimated'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import { type FindInNoteBarProps, useFindInNoteBar } from '@/components/useFindInNoteBar'
import {
  FontFamily,
  FontSize,
  SHEET_MAX_WIDTH,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_22,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_44,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { useKeyboardAnchoredBottom } from '@/hooks/useKeyboardAnchoredBottom'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

export function FindInNoteBar(props: FindInNoteBarProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors as any
  const containerStyle = useKeyboardAnchoredBottom({ gap: UI_SIZE_12 })
  const {
    query,
    inputRef,
    hasQuery,
    hasMatches,
    current,
    total,
    handleChangeQuery,
    handleNext,
    handlePrevious,
    handleDone,
  } = useFindInNoteBar(props)

  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const status = hasMatches
    ? t('noteEditor.find.matchCount', { current, total })
    : hasQuery
      ? t('noteEditor.find.noMatches')
      : ''
  const arrowColor = hasMatches ? c.onSurface : hexWithAlpha(c.onSurface, 0.38)

  return (
    <Animated.View style={[styles.row, containerStyle]}>
      <View style={styles.container}>
        <MaterialCommunityIcons name="magnify" size={UI_ICON_SIZE_22} color={c.onSurfaceVariant} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={handleChangeQuery}
          onSubmitEditing={handleNext}
          submitBehavior="submit"
          returnKeyType="search"
          placeholder={t('noteEditor.find.placeholder')}
          placeholderTextColor={c.onSurfaceVariant}
          accessibilityLabel={t('noteEditor.find.placeholder')}
          autoCorrect={false}
          autoCapitalize="none"
          style={styles.input}
        />
        <Text style={styles.status} numberOfLines={1} accessibilityLiveRegion="polite">
          {status}
        </Text>
        <Pressable
          onPress={handlePrevious}
          disabled={!hasMatches}
          android_ripple={ripple}
          accessibilityRole="button"
          accessibilityLabel={t('noteEditor.find.previous')}
          style={styles.btn}
        >
          <MaterialCommunityIcons name="chevron-up" size={UI_ICON_SIZE_22} color={arrowColor} />
        </Pressable>
        <Pressable
          onPress={handleNext}
          disabled={!hasMatches}
          android_ripple={ripple}
          accessibilityRole="button"
          accessibilityLabel={t('noteEditor.find.next')}
          style={styles.btn}
        >
          <MaterialCommunityIcons name="chevron-down" size={UI_ICON_SIZE_22} color={arrowColor} />
        </Pressable>
        <Pressable
          onPress={handleDone}
          android_ripple={ripple}
          accessibilityRole="button"
          accessibilityLabel={t('noteEditor.find.close')}
          style={styles.btn}
        >
          <MaterialCommunityIcons name="close" size={UI_ICON_SIZE_20} color={c.onSurface} />
        </Pressable>
      </View>
    </Animated.View>
  )
}

const useBarHooks = () => {
  const md3 = useMD3Theme()
  const isDark = md3.dark
  return { md3, isDark }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3, isDark }) => {
  const c = md3.colors as any
  const styles = StyleSheet.create({
    row: {
      position: 'absolute',
      left: UI_SIZE_12,
      right: UI_SIZE_12,
      flexDirection: 'row',
      alignItems: 'center',
      zIndex: 10,
    },
    container: {
      flex: 1,
      maxWidth: SHEET_MAX_WIDTH,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_4,
      borderRadius: UI_SIZE_9999,
      paddingVertical: UI_SIZE_4,
      paddingLeft: UI_SIZE_16,
      paddingRight: UI_SIZE_4,
      backgroundColor: hexWithAlpha(c.surfaceContainerHigh ?? c.surface, 0.98),
      borderColor: hexWithAlpha(c.outlineVariant, isDark ? 0.15 : 0.3),
      elevation: 6,
      shadowColor: theme.colors.black,
    },
    input: {
      flex: 1,
      minWidth: 0,
      fontFamily: FontFamily.regular,
      fontSize: FontSize.body,
      color: c.onSurface,
      paddingVertical: UI_SIZE_8,
      paddingHorizontal: UI_SIZE_8,
    },
    status: {
      fontFamily: FontFamily.medium,
      fontSize: FontSize.caption,
      color: c.onSurfaceVariant,
      fontVariant: ['tabular-nums'],
    },
    btn: {
      overflow: 'hidden',
      width: UI_SIZE_44,
      height: UI_SIZE_44,
      borderRadius: UI_SIZE_9999,
      alignItems: 'center',
      justifyContent: 'center',
    },
  })
  return styles
}, useBarHooks)
