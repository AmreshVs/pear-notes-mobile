import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View as RNView } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { SUGGESTION_KIND } from '@pear-notes/core/store/services/noteSuggestions.js'
import * as localAiSlice from '@pear-notes/core/store/slices/localAiSlice.js'
import * as notesSlice from '@pear-notes/core/store/slices/notesSlice.js'

import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  Radii,
  Space,
  UI_ICON_SIZE_14,
  UI_ICON_SIZE_16,
  UI_SIZE_4,
  UI_SIZE_6,
} from '@/constants/commonStyles'
import { hapticLight } from '@/lib/haptics'

type Suggestions = {
  noteKey?: string | null
  title?: string | null
}

type SuggestionAction = (payload: { noteKey: string | null; kind: string }) => { type: string }

const { clearNoteSuggestion, dismissNoteSuggestion, getNoteSuggestions } =
  localAiSlice as unknown as {
    clearNoteSuggestion: SuggestionAction
    dismissNoteSuggestion: SuggestionAction
    getNoteSuggestions: (state: unknown) => Suggestions
  }
const { getNotesData } = notesSlice as unknown as {
  getNotesData: (state: unknown) => Record<string, { title?: string } | undefined> | undefined
}

type NoteSuggestionChipsProps = {
  noteKey: string | null
  bottom: number
  onAcceptTitle: (title: string) => void
}

export const NoteSuggestionChips = memo(function NoteSuggestionChips({
  noteKey,
  bottom,
  onAcceptTitle,
}: NoteSuggestionChipsProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const dispatch = useDispatch()
  const suggestions = useSelector(getNoteSuggestions)
  const savedTitle = useSelector((state) =>
    noteKey ? getNotesData(state)?.[noteKey]?.title : undefined,
  )

  const suggestedTitle = suggestions.title ?? null

  const dismiss = useCallback(() => {
    hapticLight()
    dispatch(dismissNoteSuggestion({ noteKey, kind: SUGGESTION_KIND.TITLE }))
  }, [dispatch, noteKey])

  const acceptTitle = useCallback(() => {
    if (!suggestedTitle) return
    hapticLight()
    onAcceptTitle(suggestedTitle)
    dispatch(clearNoteSuggestion({ noteKey, kind: SUGGESTION_KIND.TITLE }))
  }, [dispatch, noteKey, onAcceptTitle, suggestedTitle])

  if (!noteKey || suggestions.noteKey !== noteKey || !suggestedTitle) return null
  if (String(savedTitle ?? '').trim()) return null

  return (
    <RNView style={[styles.container, { bottom }]} pointerEvents="box-none">
      <RNView style={styles.chipShell}>
        <RNView style={styles.chip}>
          <Pressable
            onPress={acceptTitle}
            accessibilityRole="button"
            accessibilityHint={t('suggestions.useTitleHint')}
            style={({ pressed }) => [styles.action, pressed && commonStyles.pressed]}
          >
            <SymbolIcon name="sparkles" size={UI_ICON_SIZE_14} color={colors.primary} />
            <Text style={styles.chipLabel} numberOfLines={1}>
              {t('suggestions.title', { title: suggestedTitle })}
            </Text>
          </Pressable>
          <Pressable
            onPress={dismiss}
            accessibilityRole="button"
            accessibilityLabel={t('suggestions.dismiss')}
            hitSlop={UI_SIZE_6}
            style={({ pressed }) => [styles.dismiss, pressed && commonStyles.pressed]}
          >
            <SymbolIcon name="xmark" size={UI_ICON_SIZE_16} color={colors.textSecondary} />
          </Pressable>
        </RNView>
      </RNView>
    </RNView>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      zIndex: 300,
      left: Space.base,
      right: Space.base,
      alignItems: 'flex-start',
      gap: Space.sm,
    },
    chipShell: {
      maxWidth: '100%',
      borderRadius: Radii.pill,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.sm,
      paddingLeft: Space.md,
      paddingRight: UI_SIZE_4,
      paddingVertical: UI_SIZE_4,
      borderRadius: Radii.pill,
      borderColor: theme.colors.cardSelectedBorder,
      backgroundColor: theme.colors.cardSelected,
    },
    chipLabel: {
      flexShrink: 1,
      fontSize: FontSize.body,
      color: theme.colors.text,
    },
    action: {
      flexShrink: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.sm,
      paddingVertical: UI_SIZE_4,
    },
    dismiss: {
      padding: UI_SIZE_6,
      borderRadius: Radii.pill,
    },
  })
  return styles
})
