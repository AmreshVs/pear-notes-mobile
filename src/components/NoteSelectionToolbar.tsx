import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Stack } from 'expo-router'

import { GENERATE_TASKS } from '@pear-notes/core/store/services/localAiPrompts.js'

import { useTheme } from '@/components/Themed'
import { FALLBACK_FOLDER_SF, FOLDER_ICON_SF } from '@/constants/folderIcons'

type MoveFolder = {
  id: string
  name: string
  icon?: string
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
  onMerge: () => void
  canCreate: boolean
  onCreate: (task: string) => void
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
  onMerge,
  canCreate,
  onCreate,
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
        <Stack.Toolbar.MenuAction
          key={folder.id}
          icon={FOLDER_ICON_SF[folder.icon ?? ''] ?? FALLBACK_FOLDER_SF}
          onPress={() => onMoveTo(folder.id)}
        >
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
        {!isTrash && (
          <Stack.Toolbar.Button
            icon="arrow.triangle.merge"
            disabled={selectedCount < 2}
            accessibilityLabel={t('notesList.merge.action')}
            onPress={onMerge}
          />
        )}
        {!isTrash && canCreate && (
          <Stack.Toolbar.Menu
            icon="sparkles"
            disabled={!hasSelection}
            accessibilityLabel={t('generate.create')}
          >
            {(GENERATE_TASKS as string[]).map((task) => (
              <Stack.Toolbar.MenuAction key={task} onPress={() => onCreate(task)}>
                {t(`generate.actions.${task}`)}
              </Stack.Toolbar.MenuAction>
            ))}
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
