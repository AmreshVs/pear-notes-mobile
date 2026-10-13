export interface InThisNoteProps {
  visible: boolean
  noteId: string
  anchor?: number
  showFindings: boolean
  showRelated: boolean
  addDisabled: boolean
  getNoteHtml: () => string
  onMakeTasks: (texts: string[]) => void
  onClose: () => void
  onOpenNote: (id: string) => void
}
