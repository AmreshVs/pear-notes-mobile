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
  FontFamily,
  FontSize,
  FontWeight,
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
  label: string
  action: string
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
): { label: string; action: string } | null {
  if (folder?.folderKey) {
    const name = folders?.[folder.folderKey]?.title
    return name
      ? { label: t('suggestions.moveTo', { folder: name }), action: t('suggestions.move') }
      : null
  }
  return folder?.name
    ? { label: t('suggestions.newFolder', { name: folder.name }), action: t('suggestions.create') }
    : null
}

const SuggestionChip = memo(function SuggestionChip({
  label,
  action,
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
        <Text style={styles.chipLabel} numberOfLines={1}>
          {label}
        </Text>
        <Pressable
          onPress={onAccept}
          accessibilityRole="button"
          accessibilityHint={hint}
          style={({ pressed }) => [styles.action, pressed && commonStyles.pressed]}
        >
          <Text style={styles.actionText}>{action}</Text>
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
  const { colors } = useTheme()
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
  const folderChip = current ? folderChipLabel(suggestions.folder, folders, t) : null

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

  if (!suggestedTitle && !folderChip) return null

  return (
    <RNView style={[styles.container, containerStyle.position]} pointerEvents="box-none">
      <RNView style={styles.caption} pointerEvents="none">
        <SymbolIcon name="sparkles" size={UI_ICON_SIZE_14} color={colors.primary} />
        <Text style={styles.captionText}>{t('suggestions.label')}</Text>
      </RNView>
      {suggestedTitle && (
        <SuggestionChip
          label={t('suggestions.title', { title: suggestedTitle })}
          action={t('suggestions.use')}
          hint={t('suggestions.useTitleHint')}
          dismissLabel={t('suggestions.dismiss')}
          onAccept={acceptTitle}
          onDismiss={dismissTitle}
        />
      )}
      {folderChip && (
        <SuggestionChip
          label={folderChip.label}
          action={folderChip.action}
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
      paddingHorizontal: Space.md,
      paddingVertical: UI_SIZE_4,
      borderRadius: Radii.pill,
      backgroundColor: theme.colors.primary,
    },
    actionText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.onPrimary,
    },
    caption: {
      ...commonStyles.row,
      gap: UI_SIZE_4,
      paddingHorizontal: UI_SIZE_4,
    },
    captionText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.textSecondary,
    },
    dismiss: {
      padding: UI_SIZE_6,
      borderRadius: Radii.pill,
    },
  })
  return styles
})
