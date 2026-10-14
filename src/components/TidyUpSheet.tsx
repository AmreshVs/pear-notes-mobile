import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { AI_SHEET_GUTTER, AiBottomSheet } from '@/components/AiBottomSheet'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import { useTidyUpSheet } from '@/components/useTidyUpSheet'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_24,
  UI_SIZE_2,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_40,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import type { TidyMove } from '@/hooks/useTidyMoves'

const LIST_MAX_HEIGHT_RATIO = 0.5

interface TidyUpSheetProps {
  visible: boolean
  moves: TidyMove[]
  onClose: () => void
}

export function TidyUpSheet({ visible, moves, onClose }: TidyUpSheetProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const { height: windowHeight } = useWindowDimensions()
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
    <AiBottomSheet
      visible={visible}
      icon="wand.and.stars"
      title={t('tidyUp.title')}
      subtitle={t('tidyUp.desc')}
      subtitleLines={3}
      onClose={onClose}
    >
      {() => (
        <>
          {moves.length > 0 && (
            <ScrollView style={[styles.listScroll, listStyle]} contentContainerStyle={styles.list}>
              {moves.map((move) => {
                const on = !skipped.has(move.key)
                return (
                  <Pressable
                    key={move.key}
                    onPress={() => handleToggle(move.key)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    style={({ pressed }) => [styles.row, pressed && commonStyles.pressed]}
                  >
                    <SymbolView
                      name={on ? 'checkmark.circle.fill' : 'circle'}
                      size={UI_ICON_SIZE_24}
                      tintColor={on ? colors.primary : colors.textMuted}
                      weight="regular"
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
            accessibilityRole="button"
            accessibilityState={{ disabled: chosenCount === 0 }}
            style={({ pressed }) => [
              styles.applyButton,
              chosenCount === 0 && commonStyles.disabled,
              pressed && commonStyles.pressed,
            ]}
          >
            <SymbolView
              name="folder"
              size={UI_ICON_SIZE_16}
              tintColor={colors.onPrimary}
              weight="semibold"
            />
            <Text style={styles.applyText}>{t('tidyUp.apply', { count: chosenCount })}</Text>
          </Pressable>
        </>
      )}
    </AiBottomSheet>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    listScroll: {
      marginHorizontal: -AI_SHEET_GUTTER,
    },
    list: {
      gap: UI_SIZE_2,
      paddingHorizontal: AI_SHEET_GUTTER,
    },
    row: {
      ...commonStyles.row,
      gap: UI_SIZE_12,
      paddingVertical: UI_SIZE_10,
      borderRadius: Radii.lg,
    },
    rowTitle: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    note: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
    },
    applyButton: {
      ...commonStyles.row,
      justifyContent: 'center',
      gap: UI_SIZE_8,
      minHeight: UI_SIZE_40,
      borderRadius: UI_SIZE_9999,
      borderCurve: 'continuous',
      backgroundColor: theme.colors.primary,
    },
    applyText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.onPrimary,
    },
  })
  return styles
})
