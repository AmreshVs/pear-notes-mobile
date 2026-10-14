import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { KeyboardSheetShell, SHEET_GUTTER } from '@/components/android/KeyboardSheetShell'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { SHEET_ICON_CHIP_ALPHA } from '@/components/android/useSheetStyles'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import { useTidyUpSheet } from '@/components/useTidyUpSheet'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_24,
  UI_SIZE_2,
  UI_SIZE_6,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_40,
  UI_SIZE_48,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import type { TidyMove } from '@/hooks/useTidyMoves'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  onSurfaceVariant?: string
}

const LIST_MAX_HEIGHT_RATIO = 0.5

interface TidyUpSheetProps {
  visible: boolean
  moves: TidyMove[]
  onClose: () => void
}

export function TidyUpSheet({ visible, moves, onClose }: TidyUpSheetProps) {
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const { height: windowHeight } = useWindowDimensions()
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const mutedColor = c.onSurfaceVariant ?? c.onSurface
  const { folders, skipped, chosenCount, handleToggle, handleApply } = useTidyUpSheet({
    visible,
    moves,
    onClose,
  })
  const listStyle = useMemo(
    () => ({ maxHeight: windowHeight * LIST_MAX_HEIGHT_RATIO }),
    [windowHeight],
  )

  return (
    <KeyboardSheetShell visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <MaterialCommunityIcons name="auto-fix" size={UI_ICON_SIZE_20} color={c.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('tidyUp.title')}</Text>
          <Text style={styles.subtitle}>{t('tidyUp.desc')}</Text>
        </View>
        <Pressable
          hitSlop={12}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          style={styles.closeButton}
        >
          <MaterialCommunityIcons name="close" size={UI_ICON_SIZE_24} color={mutedColor} />
        </Pressable>
      </View>
      {moves.length > 0 && (
        <ScrollView style={[styles.listScroll, listStyle]} contentContainerStyle={styles.list}>
          {moves.map((move) => {
            const on = !skipped.has(move.key)
            return (
              <Pressable
                key={move.key}
                onPress={() => handleToggle(move.key)}
                android_ripple={ripple}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                style={styles.row}
              >
                <MaterialCommunityIcons
                  name={on ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={UI_ICON_SIZE_24}
                  color={on ? c.primary : mutedColor}
                />
                <View style={commonStyles.flex1}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {move.title || t('noteCard.untitled')}
                  </Text>
                  <Text style={styles.note} numberOfLines={1}>
                    {t('tidyUp.moveTo', { folder: folders[move.to]?.title ?? '' })}
                  </Text>
                </View>
              </Pressable>
            )
          })}
        </ScrollView>
      )}
      <Pressable
        onPress={handleApply}
        disabled={chosenCount === 0}
        android_ripple={ripple}
        accessibilityRole="button"
        accessibilityState={{ disabled: chosenCount === 0 }}
        style={[styles.applyButton, chosenCount === 0 && commonStyles.disabled]}
      >
        <Text style={styles.applyText}>{t('tidyUp.apply', { count: chosenCount })}</Text>
      </Pressable>
    </KeyboardSheetShell>
  )
}

const useStyles = createThemedStylesheetWithHooks((_theme, md3Theme) => {
  const c = md3Theme.colors as ExtendedColors
  const styles = StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: UI_SIZE_12,
    },
    badge: {
      ...commonStyles.centered,
      width: UI_SIZE_40,
      height: UI_SIZE_40,
      borderRadius: UI_SIZE_12,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, SHEET_ICON_CHIP_ALPHA),
    },
    headerText: {
      flex: 1,
      gap: UI_SIZE_2,
    },
    title: {
      fontSize: FontSize.title,
      lineHeight: 26,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onSurface,
    },
    subtitle: {
      fontSize: FontSize.body,
      lineHeight: 20,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    closeButton: {
      ...commonStyles.centered,
      width: UI_SIZE_40,
      height: UI_SIZE_40,
      marginTop: -UI_SIZE_6,
      marginRight: -UI_SIZE_8,
    },
    listScroll: {
      marginHorizontal: -SHEET_GUTTER,
    },
    list: {
      gap: UI_SIZE_2,
      paddingHorizontal: SHEET_GUTTER,
    },
    row: {
      ...commonStyles.row,
      gap: UI_SIZE_12,
      paddingVertical: UI_SIZE_8,
    },
    rowTitle: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurface,
    },
    note: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    applyButton: {
      ...commonStyles.centered,
      minHeight: UI_SIZE_48,
      borderRadius: UI_SIZE_9999,
      overflow: 'hidden',
      backgroundColor: c.primary,
    },
    applyText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onPrimary,
    },
  })
  return styles
}, useMD3Theme)
