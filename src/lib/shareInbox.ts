import * as FileSystem from 'expo-file-system/legacy'

import { toBackendPath } from '@/lib/noteAttachmentManager'
import type {
  RawShareManifest,
  RawShareManifestItem,
  SharedItem,
  ShareInboxChange,
  SharePayload,
} from '@/lib/shareIntake.types'

import ExpoShareIntake from '../../modules/expo-share-intake'

const SHARE_INBOX_DIRECTORY_NAME = 'share-intake'
const MANIFEST_FILE_NAME = 'manifest.json'
const SUPPORTED_MANIFEST_VERSION = 1
const ABANDONED_SHARE_MAX_AGE_MS = 24 * 60 * 60 * 1000
const MILLISECONDS_PER_SECOND = 1000
const DEFAULT_MIME_TYPE = 'application/octet-stream'
const WEB_URL_PATTERN = /^https?:\/\/\S+$/i
const PATH_SEPARATOR_PATTERN = /[/\\]/
const RESERVED_FILE_NAMES = new Set(['', '.', '..', MANIFEST_FILE_NAME])

function getShareInboxDirectory(): string | null {
  const documentDirectory = FileSystem.documentDirectory
  return documentDirectory ? `${documentDirectory}${SHARE_INBOX_DIRECTORY_NAME}/` : null
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

async function deleteShareDirectory(directory: string) {
  await FileSystem.deleteAsync(directory, { idempotent: true }).catch(() => {})
}

async function removeIfAbandoned(directory: string) {
  const info = await FileSystem.getInfoAsync(directory).catch(() => null)
  if (!info?.exists) return
  const modifiedAt = (info.modificationTime ?? 0) * MILLISECONDS_PER_SECOND
  if (Date.now() - modifiedAt > ABANDONED_SHARE_MAX_AGE_MS) await deleteShareDirectory(directory)
}

function parseManifest(raw: string): RawShareManifest | null {
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== SUPPORTED_MANIFEST_VERSION || !Array.isArray(parsed.items)) {
      return null
    }
    return {
      version: parsed.version,
      createdAt: Number(parsed.createdAt) || 0,
      skipped: Number(parsed.skipped) || 0,
      items: parsed.items.filter((item: unknown) => !!item && typeof item === 'object'),
    }
  } catch {
    return null
  }
}

async function resolveFileItem(
  directory: string,
  id: string,
  raw: RawShareManifestItem,
): Promise<SharedItem | null> {
  const fileName = typeof raw.file === 'string' ? raw.file : ''
  if (RESERVED_FILE_NAMES.has(fileName) || PATH_SEPARATOR_PATTERN.test(fileName)) return null
  const uri = `${directory}${encodeURIComponent(fileName)}`
  const info = await FileSystem.getInfoAsync(uri).catch(() => null)
  if (!info?.exists || info.isDirectory) return null
  return {
    kind: 'file',
    id,
    uri,
    path: toBackendPath(uri),
    name: fileName,
    mimeType: asTrimmedString(raw.mimeType) ?? DEFAULT_MIME_TYPE,
    size: info.size ?? (Number(raw.size) || 0),
  }
}

async function resolveManifestItem(
  directory: string,
  payloadId: string,
  raw: RawShareManifestItem,
  index: number,
): Promise<SharedItem | null> {
  const id = `${payloadId}:${index}`
  const title = asTrimmedString(raw.title)
  if (raw.kind === 'file') return resolveFileItem(directory, id, raw)
  if (raw.kind === 'url') {
    const url = asTrimmedString(raw.url)
    if (!url) return null
    return WEB_URL_PATTERN.test(url)
      ? { kind: 'url', id, url, title }
      : { kind: 'text', id, text: url, title }
  }
  if (raw.kind === 'text') {
    const text = typeof raw.text === 'string' ? raw.text : ''
    return text.trim().length > 0 ? { kind: 'text', id, text, title } : null
  }
  return null
}

async function readSharePayload(inbox: string, entry: string): Promise<SharePayload | null> {
  const directory = `${inbox}${entry}/`
  const raw = await FileSystem.readAsStringAsync(`${directory}${MANIFEST_FILE_NAME}`).catch(
    () => null,
  )
  if (raw === null) {
    await removeIfAbandoned(directory)
    return null
  }
  const manifest = parseManifest(raw)
  if (!manifest) {
    await deleteShareDirectory(directory)
    return null
  }
  const resolved = await Promise.all(
    manifest.items.map((item, index) => resolveManifestItem(directory, entry, item, index)),
  )
  const items = resolved.filter((item): item is SharedItem => item !== null)
  if (items.length === 0) {
    await deleteShareDirectory(directory)
    return null
  }
  return { id: entry, directory, createdAt: manifest.createdAt, skipped: manifest.skipped, items }
}

export async function readShareInbox(): Promise<SharePayload[]> {
  const inbox = getShareInboxDirectory()
  if (!inbox) return []
  const entries = await FileSystem.readDirectoryAsync(inbox).catch(() => [] as string[])
  const payloads = await Promise.all(entries.map((entry) => readSharePayload(inbox, entry)))
  return payloads
    .filter((payload): payload is SharePayload => payload !== null)
    .sort((a, b) => a.createdAt - b.createdAt)
}

export async function consumeSharePayloads(payloads: SharePayload[]) {
  await Promise.all(
    payloads.map((payload) =>
      FileSystem.deleteAsync(`${payload.directory}${MANIFEST_FILE_NAME}`, {
        idempotent: true,
      }).catch(() => {}),
    ),
  )
}

export async function discardSharePayloads(payloads: SharePayload[]) {
  await Promise.all(payloads.map((payload) => deleteShareDirectory(payload.directory)))
}

export async function importNativeShares(): Promise<void> {
  if (!ExpoShareIntake) return
  try {
    await ExpoShareIntake.importPendingShares()
  } catch {}
}

export function isNativeShareImportActive(): boolean {
  try {
    return ExpoShareIntake?.isPreparing() ?? false
  } catch {
    return false
  }
}

export function subscribeToNativeShareInbox(
  listener: (change: ShareInboxChange) => void,
): () => void {
  if (!ExpoShareIntake) return () => {}
  const subscription = ExpoShareIntake.addListener('onInboxChanged', (event) =>
    listener({
      preparing: !!event?.preparing,
      unreadableCount: Number(event?.unreadableCount) || 0,
    }),
  )
  return () => subscription.remove()
}
