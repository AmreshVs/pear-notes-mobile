import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Stack } from 'expo-router'

import { useTheme } from '@/components/Themed'

type MoveFolder = {
  id: string
  name: string
}

type NoteSelectionToolbarProps = {
  selectedCount: number
  isAllSelected: boolean
  isTrash: boolean
  moveFolders: MoveFolder[]
  onSelectAll: () => void
  onClearSelection: () => void
  onDone: () => void
  onMoveTo: (folderId: string) => void
  onRestore: () => void
  onDelete: () => void
}

export const NoteSelectionToolbar = memo(function NoteSelectionToolbar({
  selectedCount,
  isAllSelected,
  isTrash,
  moveFolders,
  onSelectAll,
  onClearSelection,
  onDone,
  onMoveTo,
  onRestore,
  onDelete,
}: NoteSelectionToolbarProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()

  const hasSelection = selectedCount > 0

  const handleToggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      onClearSelection()
      return
    }
    onSelectAll()
  }, [isAllSelected, onClearSelection, onSelectAll])

  const moveActions = useMemo(
    () =>
      moveFolders.map((folder) => (
        <Stack.Toolbar.MenuAction key={folder.id} icon="folder" onPress={() => onMoveTo(folder.id)}>
          {folder.name}
        </Stack.Toolbar.MenuAction>
      )),
    [moveFolders, onMoveTo],
  )

  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button onPress={onDone}>{t('common.done')}</Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="bottom">
        <Stack.Toolbar.Button onPress={handleToggleSelectAll}>
          {isAllSelected
            ? t('folderView.selection.deselectAll')
            : t('folderView.selection.selectAll')}
        </Stack.Toolbar.Button>
        <Stack.Toolbar.Spacer />
        {isTrash ? (
          <Stack.Toolbar.Button
            icon="arrow.uturn.backward"
            disabled={!hasSelection}
            accessibilityLabel={t('folderView.selection.restore')}
            onPress={onRestore}
          />
        ) : (
          <Stack.Toolbar.Menu
            icon="folder"
            disabled={!hasSelection || moveActions.length === 0}
            accessibilityLabel={t('folderView.selection.move')}
          >
            {moveActions}
          </Stack.Toolbar.Menu>
        )}
        <Stack.Toolbar.Button
          icon="trash"
          tintColor={colors.error}
          disabled={!hasSelection}
          accessibilityLabel={
            isTrash ? t('folderView.permanentlyDeleteTitle') : t('noteCard.actions.delete')
          }
          onPress={onDelete}
        />
      </Stack.Toolbar>
    </>
  )
})
