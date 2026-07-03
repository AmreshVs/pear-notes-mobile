let pendingImportBuffer: Uint8Array | null = null

export function setPendingImportBuffer(buffer: Uint8Array): void {
  pendingImportBuffer = buffer
}

export function takePendingImportBuffer(): Uint8Array | null {
  const buffer = pendingImportBuffer
  pendingImportBuffer = null
  return buffer
}
