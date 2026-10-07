import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { GlassView } from '@/components/GlassView'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import { type FindInNoteBarProps, useFindInNoteBar } from '@/components/useFindInNoteBar'
import {
  FontFamily,
  FontSize,
  Radii,
  SHEET_MAX_WIDTH,
  Space,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_18,
  UI_SIZE_52,
} from '@/constants/commonStyles'

export function FindInNoteBar({ toolbarBottom = 0, ...options }: FindInNoteBarProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
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
  } = useFindInNoteBar(options)

  const wrapStyle = useMemo(
    () => [styles.wrap, { bottom: toolbarBottom }],
    [styles.wrap, toolbarBottom],
  )
  const status = hasMatches
    ? t('noteEditor.find.matchCount', { current, total })
    : hasQuery
      ? t('noteEditor.find.noMatches')
      : ''
  const arrowColor = hasMatches ? colors.text : colors.textMuted

  return (
    <View style={wrapStyle}>
      <GlassView intensity={0} borderRadius={Radii.btn} style={styles.bar} isInteractive>
        <SymbolView
          name="magnifyingglass"
          size={UI_ICON_SIZE_16}
          tintColor={colors.textSecondary}
          weight="semibold"
        />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={handleChangeQuery}
          onSubmitEditing={handleNext}
          submitBehavior="submit"
          returnKeyType="search"
          placeholder={t('noteEditor.find.placeholder')}
          placeholderTextColor={colors.textMuted}
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
          accessibilityRole="button"
          accessibilityLabel={t('noteEditor.find.previous')}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <SymbolView
            name="chevron.up"
            size={UI_ICON_SIZE_18}
            tintColor={arrowColor}
            weight="semibold"
          />
        </Pressable>
        <Pressable
          onPress={handleNext}
          disabled={!hasMatches}
          accessibilityRole="button"
          accessibilityLabel={t('noteEditor.find.next')}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <SymbolView
            name="chevron.down"
            size={UI_ICON_SIZE_18}
            tintColor={arrowColor}
            weight="semibold"
          />
        </Pressable>
        <Pressable
          onPress={handleDone}
          accessibilityRole="button"
          accessibilityLabel={t('noteEditor.find.close')}
          style={({ pressed }) => [styles.doneButton, pressed && styles.pressed]}
        >
          <Text style={styles.doneLabel}>{t('common.done')}</Text>
        </Pressable>
      </GlassView>
    </View>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: Space.base,
      right: Space.base,
      alignItems: 'center',
    },
    bar: {
      width: '100%',
      maxWidth: SHEET_MAX_WIDTH,
      minHeight: UI_SIZE_52,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: Space.base,
      paddingRight: Space.sm,
      gap: Space.xs,
      overflow: 'hidden',
    },
    input: {
      flex: 1,
      minWidth: 0,
      fontFamily: FontFamily.regular,
      fontSize: FontSize.body,
      color: theme.colors.text,
      paddingVertical: Space.sm,
      paddingHorizontal: Space.xs,
    },
    status: {
      fontFamily: FontFamily.medium,
      fontSize: FontSize.caption,
      color: theme.colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    iconButton: {
      width: Space.xxl + Space.xs,
      height: Space.xxl + Space.xs,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radii.pill,
    },
    doneButton: {
      paddingHorizontal: Space.md,
      height: Space.xxl + Space.xs,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radii.pill,
      backgroundColor: theme.colors.primary,
    },
    doneLabel: {
      fontFamily: FontFamily.semiBold,
      fontSize: FontSize.body,
      color: theme.colors.background,
    },
    pressed: {
      opacity: 0.7,
    },
  })
  return styles
})
