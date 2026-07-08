let pendingImportPath: string | null = null

export function setPendingImportPath(path: string): void {
  pendingImportPath = path
}

export function takePendingImportPath(): string | null {
  const path = pendingImportPath
  pendingImportPath = null
  return path
}
