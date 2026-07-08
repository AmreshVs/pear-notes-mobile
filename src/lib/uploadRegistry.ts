import { useSyncExternalStore } from 'react'

export type NoteUpload = {
  id: string
  fileName: string
  progress: number
  cancel: () => void
}

const uploads = new Map<string, NoteUpload>()
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function startNoteUpload(noteId: string, upload: NoteUpload) {
  uploads.set(noteId, upload)
  emit()
}

export function updateNoteUploadProgress(noteId: string, progress: number) {
  const current = uploads.get(noteId)
  if (!current || current.progress === progress) return
  uploads.set(noteId, { ...current, progress })
  emit()
}

export function endNoteUpload(noteId: string) {
  if (uploads.delete(noteId)) emit()
}

export function getNoteUpload(noteId: string | null): NoteUpload | null {
  if (!noteId) return null
  return uploads.get(noteId) ?? null
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useNoteUpload(noteId: string | null): NoteUpload | null {
  return useSyncExternalStore(subscribe, () => getNoteUpload(noteId))
}
