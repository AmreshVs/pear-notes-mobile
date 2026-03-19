import { createContext, useContext } from 'react'

export interface NoteEditorContextType {
  openNote: (id: string) => void
  closeNote: () => void
  isOpen: boolean
}

export const NoteEditorContext = createContext<NoteEditorContextType>({
  openNote: () => {},
  closeNote: () => {},
  isOpen: false,
})

export const useNoteEditor = () => useContext(NoteEditorContext)
