import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { GlassView } from '@/components/GlassView'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import { type FindInNoteBarProps, useFindInNoteBar } from '@/components/useFindInNoteBar'
import {
  commonStyles,
  FontFamily,
  FontSize,
  Radii,
  Space,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_18,
  UI_SIZE_44,
  UI_SIZE_52,
} from '@/constants/commonStyles'

const BAR_RADIUS = UI_SIZE_52 / 2

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
  const handleClear = useCallback(() => handleChangeQuery(''), [handleChangeQuery])
  const pressedStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [styles.iconButton, pressed && commonStyles.pressed],
    [styles.iconButton],
  )
  const clearStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => pressed && commonStyles.pressed,
    [],
  )
  const status = hasMatches
    ? t('noteEditor.find.matchCount', { current, total })
    : hasQuery
      ? t('noteEditor.find.noMatches')
      : ''
  const arrowColor = hasMatches ? colors.text : colors.textMuted

  return (
    <View style={wrapStyle}>
      <View style={[styles.fieldShadow, styles.shadow]}>
        <GlassView
          intensity={0}
          borderRadius={BAR_RADIUS}
          style={styles.field}
          opaqueColor={colors.toolbarSurface}
          isInteractive
        >
          <SymbolView
            name="magnifyingglass"
            size={UI_ICON_SIZE_16}
            tintColor={colors.textMuted}
            weight="medium"
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
            selectionColor={colors.primary}
            autoCorrect={false}
            autoCapitalize="none"
            style={styles.input}
          />
          {hasQuery && (
            <Text style={styles.status} numberOfLines={1} accessibilityLiveRegion="polite">
              {status}
            </Text>
          )}
          {hasQuery && (
            <Pressable
              onPress={handleClear}
              accessibilityRole="button"
              accessibilityLabel={t('common.clear')}
              hitSlop={Space.sm}
              style={clearStyle}
            >
              <SymbolView
                name="xmark.circle.fill"
                size={UI_ICON_SIZE_18}
                tintColor={colors.textMuted}
              />
            </Pressable>
          )}
        </GlassView>
      </View>

      <View style={[styles.groupShadow, styles.shadow]}>
        <GlassView
          intensity={0}
          borderRadius={BAR_RADIUS}
          style={styles.group}
          opaqueColor={colors.toolbarSurface}
          isInteractive
        >
          <Pressable
            onPress={handlePrevious}
            disabled={!hasMatches}
            accessibilityRole="button"
            accessibilityLabel={t('noteEditor.find.previous')}
            style={pressedStyle}
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
            style={pressedStyle}
          >
            <SymbolView
              name="chevron.down"
              size={UI_ICON_SIZE_18}
              tintColor={arrowColor}
              weight="semibold"
            />
          </Pressable>
        </GlassView>
      </View>

      <View style={[styles.groupShadow, styles.shadow]}>
        <GlassView
          intensity={0}
          borderRadius={BAR_RADIUS}
          style={styles.circle}
          opaqueColor={colors.toolbarSurface}
          isInteractive
        >
          <Pressable
            onPress={handleDone}
            accessibilityRole="button"
            accessibilityLabel={t('noteEditor.find.close')}
            style={pressedStyle}
          >
            <SymbolView
              name="xmark"
              size={UI_ICON_SIZE_16}
              tintColor={colors.text}
              weight="semibold"
            />
          </Pressable>
        </GlassView>
      </View>
    </View>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: Space.base,
      right: Space.base,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.sm,
    },
    fieldShadow: {
      flex: 1,
      minWidth: 0,
      borderRadius: BAR_RADIUS,
    },
    groupShadow: {
      flexShrink: 0,
      borderRadius: BAR_RADIUS,
    },
    shadow: theme.isDark
      ? {}
      : {
          backgroundColor: theme.colors.toolbarSurface,
          shadowColor: theme.colors.black,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
        },
    field: {
      height: UI_SIZE_52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.sm,
      paddingLeft: Space.base,
      paddingRight: Space.md,
      backgroundColor: theme.colors.toolbarGlass,
      overflow: 'hidden',
    },
    group: {
      height: UI_SIZE_52,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Space.xs,
      backgroundColor: theme.colors.toolbarGlass,
      overflow: 'hidden',
    },
    circle: {
      width: UI_SIZE_52,
      height: UI_SIZE_52,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.toolbarGlass,
      overflow: 'hidden',
    },
    input: {
      flex: 1,
      minWidth: 0,
      fontFamily: FontFamily.regular,
      fontSize: FontSize.subtitle,
      color: theme.colors.text,
      paddingVertical: Space.sm,
    },
    status: {
      fontFamily: FontFamily.medium,
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    iconButton: {
      width: UI_SIZE_44,
      height: UI_SIZE_44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radii.pill,
    },
  })
  return styles
})
