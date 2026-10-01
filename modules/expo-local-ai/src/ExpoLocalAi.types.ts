export interface LocalAiDiskSpace {
  freeBytes: number
  totalBytes: number
}

export interface LocalAiStorageRoots {
  home: string
  documents: string
  caches: string
  models: string
  shared?: string
  appBytes: number
}

export interface LocalAiDirectoryEntry {
  name: string
  isDirectory: boolean
  bytes: number
}

export interface LocalAiDecodedAudio {
  durationMs: number
  bytes: number
}

export interface LocalAiPcmChunkEvent {
  data: string
  level: number
}

export type ExpoLocalAiEvents = {
  onPcmChunk: (event: LocalAiPcmChunkEvent) => void
}
