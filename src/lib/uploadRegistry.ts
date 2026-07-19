import { useSyncExternalStore } from 'react'

export type UploadItemStatus = 'queued' | 'uploading' | 'done' | 'cancelled'

export type NoteUploadItem = {
  id: string
  fileName: string
  progress: number
  status: UploadItemStatus
  cancel?: () => void
}

export type NoteUploadQueue = {
  items: NoteUploadItem[]
  activeItem: NoteUploadItem | null
  completedCount: number
  totalCount: number
  isActive: boolean
}

const queues = new Map<string, NoteUploadItem[]>()
const snapshots = new Map<string, NoteUploadQueue>()
const cancelledIds = new Set<string>()
const listeners = new Set<() => void>()

const EMPTY_QUEUE: NoteUploadQueue = {
  items: [],
  activeItem: null,
  completedCount: 0,
  totalCount: 0,
  isActive: false,
}

function buildSnapshot(noteId: string) {
  const items = queues.get(noteId)
  if (!items || items.length === 0) {
    snapshots.delete(noteId)
    return
  }
  const activeItem = items.find((item) => item.status === 'uploading') ?? null
  const completedCount = items.filter((item) => item.status === 'done').length
  const totalCount = items.filter((item) => item.status !== 'cancelled').length
  snapshots.set(noteId, {
    items,
    activeItem,
    completedCount,
    totalCount,
    isActive: items.some((item) => item.status === 'queued' || item.status === 'uploading'),
  })
}

function emit(noteId: string) {
  buildSnapshot(noteId)
  listeners.forEach((listener) => listener())
}

function mutateItem(noteId: string, itemId: string, patch: Partial<NoteUploadItem>) {
  const items = queues.get(noteId)
  if (!items) return
  const index = items.findIndex((item) => item.id === itemId)
  if (index === -1) return
  const next = items.slice()
  next[index] = { ...next[index], ...patch }
  queues.set(noteId, next)
  emit(noteId)
}

export function enqueueNoteUploads(
  noteId: string,
  entries: { id: string; fileName: string }[],
): void {
  if (entries.length === 0) return
  const existing = queues.get(noteId) ?? []
  const queued: NoteUploadItem[] = entries.map((entry) => ({
    id: entry.id,
    fileName: entry.fileName,
    progress: 0,
    status: 'queued',
  }))
  queues.set(noteId, [...existing, ...queued])
  emit(noteId)
}

export function beginNoteUploadItem(noteId: string, itemId: string, cancel: () => void): void {
  mutateItem(noteId, itemId, { status: 'uploading', cancel })
}

export function updateNoteUploadItemProgress(
  noteId: string,
  itemId: string,
  progress: number,
): void {
  const current = queues.get(noteId)?.find((item) => item.id === itemId)
  if (!current || current.progress === progress) return
  mutateItem(noteId, itemId, { progress })
}

export function completeNoteUploadItem(noteId: string, itemId: string): void {
  mutateItem(noteId, itemId, { status: 'done', progress: 100, cancel: undefined })
}

export function cancelNoteUploadItem(noteId: string, itemId: string): void {
  const target = queues.get(noteId)?.find((item) => item.id === itemId)
  if (!target || target.status === 'done' || target.status === 'cancelled') return
  cancelledIds.add(itemId)
  target.cancel?.()
  mutateItem(noteId, itemId, { status: 'cancelled', cancel: undefined })
}

export function cancelNoteUploadQueue(noteId: string): void {
  const items = queues.get(noteId)
  if (!items) return
  items
    .filter((item) => item.status === 'queued' || item.status === 'uploading')
    .forEach((item) => cancelNoteUploadItem(noteId, item.id))
}

export function isNoteUploadItemCancelled(itemId: string): boolean {
  return cancelledIds.has(itemId)
}

export function clearNoteUploadQueue(noteId: string): void {
  const items = queues.get(noteId)
  if (!items) return
  if (items.some((item) => item.status === 'queued' || item.status === 'uploading')) return
  items.forEach((item) => cancelledIds.delete(item.id))
  queues.delete(noteId)
  emit(noteId)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getNoteUploadQueue(noteId: string | null): NoteUploadQueue {
  if (!noteId) return EMPTY_QUEUE
  return snapshots.get(noteId) ?? EMPTY_QUEUE
}

export function useNoteUploadQueue(noteId: string | null): NoteUploadQueue {
  return useSyncExternalStore(subscribe, () => getNoteUploadQueue(noteId))
}
