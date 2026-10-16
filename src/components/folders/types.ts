export type FoldersPaneProps = {
  embedded?: boolean
  selectedFolderId?: string
  onSelectFolder?: (folderId: string) => void
}

export type SmartViewsHeaderProps = {
  title: string
  expanded: boolean
  onToggle: () => void
}
