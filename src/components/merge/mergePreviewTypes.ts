export type MergeLine = {
  kind: string
  text: string
  checked?: boolean
  added?: boolean
}

export type MergeSource = {
  key: string | null
  title: string
  folderKey: string | null
  updatedAt: number | null
  lines: MergeLine[]
}

export type MergePreview = {
  status: 'loading' | 'ready' | 'error'
  keys: string[]
  error?: string
  title?: string
  folderKey?: string | null
  sources?: MergeSource[]
  result?: MergeLine[]
  dropped?: { text: string; from: number }[]
}

export type MergeColumn = {
  id: string
  label: string
  title: string
  lines: MergeLine[]
  result: boolean
}
