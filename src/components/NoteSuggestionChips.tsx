import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View as RNView } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import type { TFunction } from 'i18next'

import { SUGGESTION_KIND } from '@pear-notes/core/store/services/noteSuggestions.js'
import { getFoldersData } from '@pear-notes/core/store/slices/foldersSlice.js'
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

type FolderSuggestion = { folderKey?: string; name?: string }

type Suggestions = {
  noteKey?: string | null
  title?: string | null
  folder?: FolderSuggestion | null
}

type ChipProps = {
  icon: 'sparkles' | 'folder'
  label: string
  hint: string
  dismissLabel: string
  onAccept: () => void
  onDismiss: () => void
}

type SuggestionAction = (payload: { noteKey: string | null; kind: string }) => { type: string }

const { acceptFolderSuggestion, clearNoteSuggestion, dismissNoteSuggestion, getNoteSuggestions } =
  localAiSlice as unknown as {
    acceptFolderSuggestion: (payload: { noteKey: string | null }) => { type: string }
    clearNoteSuggestion: SuggestionAction
    dismissNoteSuggestion: SuggestionAction
    getNoteSuggestions: (state: unknown) => Suggestions
  }

function folderChipLabel(
  folder: FolderSuggestion | null | undefined,
  folders: Record<string, { title?: string }> | undefined,
  t: TFunction,
): string | null {
  if (folder?.folderKey) {
    const name = folders?.[folder.folderKey]?.title
    return name ? t('suggestions.moveTo', { folder: name }) : null
  }
  return folder?.name ? t('suggestions.newFolder', { name: folder.name }) : null
}

const SuggestionChip = memo(function SuggestionChip({
  icon,
  label,
  hint,
  dismissLabel,
  onAccept,
  onDismiss,
}: ChipProps) {
  const { colors } = useTheme()
  const styles = useStyles()
  return (
    <RNView style={styles.chipShell}>
      <RNView style={styles.chip}>
        <Pressable
          onPress={onAccept}
          accessibilityRole="button"
          accessibilityHint={hint}
          style={({ pressed }) => [styles.action, pressed && commonStyles.pressed]}
        >
          <SymbolIcon name={icon} size={UI_ICON_SIZE_14} color={colors.primary} />
          <Text style={styles.chipLabel} numberOfLines={1}>
            {label}
          </Text>
        </Pressable>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel={dismissLabel}
          hitSlop={UI_SIZE_6}
          style={({ pressed }) => [styles.dismiss, pressed && commonStyles.pressed]}
        >
          <SymbolIcon name="xmark" size={UI_ICON_SIZE_16} color={colors.textSecondary} />
        </Pressable>
      </RNView>
    </RNView>
  )
})
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
  const styles = useStyles()
  const dispatch = useDispatch()
  const suggestions = useSelector(getNoteSuggestions)
  const folders = useSelector(getFoldersData) as Record<string, { title?: string }> | undefined
  const savedTitle = useSelector((state) =>
    noteKey ? getNotesData(state)?.[noteKey]?.title : undefined,
  )
  const containerStyle = useMemo(() => StyleSheet.create({ position: { bottom } }), [bottom])

  const current = !!noteKey && suggestions.noteKey === noteKey
  const suggestedTitle =
    current && !String(savedTitle ?? '').trim() ? (suggestions.title ?? null) : null
  const folderLabel = current ? folderChipLabel(suggestions.folder, folders, t) : null

  const dismissTitle = useCallback(() => {
    hapticLight()
    dispatch(dismissNoteSuggestion({ noteKey, kind: SUGGESTION_KIND.TITLE }))
  }, [dispatch, noteKey])

  const dismissFolder = useCallback(() => {
    hapticLight()
    dispatch(dismissNoteSuggestion({ noteKey, kind: SUGGESTION_KIND.FOLDER }))
  }, [dispatch, noteKey])

  const acceptTitle = useCallback(() => {
    if (!suggestedTitle) return
    hapticLight()
    onAcceptTitle(suggestedTitle)
    dispatch(clearNoteSuggestion({ noteKey, kind: SUGGESTION_KIND.TITLE }))
  }, [dispatch, noteKey, onAcceptTitle, suggestedTitle])

  const acceptFolder = useCallback(() => {
    hapticLight()
    dispatch(acceptFolderSuggestion({ noteKey }))
  }, [dispatch, noteKey])

  if (!suggestedTitle && !folderLabel) return null

  return (
    <RNView style={[styles.container, containerStyle.position]} pointerEvents="box-none">
      {suggestedTitle && (
        <SuggestionChip
          icon="sparkles"
          label={t('suggestions.title', { title: suggestedTitle })}
          hint={t('suggestions.useTitleHint')}
          dismissLabel={t('suggestions.dismiss')}
          onAccept={acceptTitle}
          onDismiss={dismissTitle}
        />
      )}
      {folderLabel && (
        <SuggestionChip
          icon="folder"
          label={folderLabel}
          hint={t('suggestions.useFolderHint')}
          dismissLabel={t('suggestions.dismissFolder')}
          onAccept={acceptFolder}
          onDismiss={dismissFolder}
        />
      )}
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
