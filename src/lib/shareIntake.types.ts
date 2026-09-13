export type SharedTextItem = {
  kind: 'text'
  id: string
  text: string
  title?: string
}

export type SharedUrlItem = {
  kind: 'url'
  id: string
  url: string
  title?: string
}

export type SharedFileItem = {
  kind: 'file'
  id: string
  uri: string
  path: string
  name: string
  mimeType: string
  size: number
}

export type SharedItem = SharedTextItem | SharedUrlItem | SharedFileItem

export type SharePayload = {
  id: string
  directory: string
  createdAt: number
  skipped: number
  items: SharedItem[]
}

export type SharedItemCategory = 'photo' | 'video' | 'audio' | 'file' | 'link' | 'text'

export type SharedParagraph = {
  text: string
  link?: string
}

export type ShareIntakeSnapshot = {
  payloads: SharePayload[]
  items: SharedItem[]
  preparing: boolean
}

export type ShareInboxChange = {
  preparing: boolean
  unreadableCount: number
}

export type RawShareManifestItem = {
  kind?: unknown
  text?: unknown
  title?: unknown
  url?: unknown
  file?: unknown
  mimeType?: unknown
  size?: unknown
}

export type RawShareManifest = {
  version: number
  createdAt: number
  skipped: number
  items: RawShareManifestItem[]
}
