export type PendingImport = {
  path: string
  sealed: boolean
}

let pendingImport: PendingImport | null = null

export function setPendingImport(path: string, sealed: boolean): void {
  pendingImport = { path, sealed }
}

export function takePendingImport(): PendingImport | null {
  const pending = pendingImport
  pendingImport = null
  return pending
}
