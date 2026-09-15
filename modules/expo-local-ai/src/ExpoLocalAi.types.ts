export interface LocalAiDiskSpace {
  freeBytes: number
  totalBytes: number
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
