import type { DocumentPickerAsset } from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'

import { toBackendPath } from '@/lib/noteAttachmentManager'
import { appendHtmlToStoredNote, escapeHtml } from '@/lib/noteUploadManager'
import type {
  SharedFileItem,
  SharedItem,
  SharedItemCategory,
  SharedParagraph,
} from '@/lib/shareIntake.types'
import { isAudioFile, isImageFile, isVideoFile } from '@/utils/media'

const HEIC_MIME_TYPES = new Set([
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
])
const HEIC_EXTENSION_PATTERN = /\.(heic|heif)$/i
const JPEG_MIME_TYPE = 'image/jpeg'
const JPEG_EXTENSION = '.jpg'
const CONVERTED_IMAGE_QUALITY = 0.9
const LINE_BREAK_PATTERN = /\r\n|\r|\n/
const TRAILING_WHITESPACE_PATTERN = /\s+$/
const EMPTY_PARAGRAPH_HTML = '<p></p>'

export const MAX_SHARED_PREVIEWS = 3

const SHARED_ITEM_CATEGORY_ORDER: SharedItemCategory[] = [
  'photo',
  'video',
  'audio',
  'file',
  'link',
  'text',
]

export const isSharedFileItem = (item: SharedItem): item is SharedFileItem => item.kind === 'file'

export function getSharedItemCategory(item: SharedItem): SharedItemCategory {
  if (item.kind === 'url') return 'link'
  if (item.kind === 'text') return 'text'
  if (isImageFile(item.name, item.mimeType)) return 'photo'
  if (isVideoFile(item.name, item.mimeType)) return 'video'
  if (isAudioFile(item.name, item.mimeType)) return 'audio'
  return 'file'
}

export function countSharedItemCategories(items: SharedItem[]): [SharedItemCategory, number][] {
  const counts = new Map<SharedItemCategory, number>()
  items.forEach((item) => {
    const category = getSharedItemCategory(item)
    counts.set(category, (counts.get(category) ?? 0) + 1)
  })
  return SHARED_ITEM_CATEGORY_ORDER.filter((category) => counts.has(category)).map((category) => [
    category,
    counts.get(category) ?? 0,
  ])
}

function textParagraphs(text: string): SharedParagraph[] {
  const lines = text.replace(TRAILING_WHITESPACE_PATTERN, '').split(LINE_BREAK_PATTERN)
  return lines.reduce<SharedParagraph[]>((paragraphs, line) => {
    const isBlank = line.trim().length === 0
    const previous = paragraphs[paragraphs.length - 1]
    if (isBlank && (!previous || previous.text === '')) return paragraphs
    paragraphs.push({ text: isBlank ? '' : line })
    return paragraphs
  }, [])
}

function itemParagraphs(item: SharedItem): SharedParagraph[] {
  if (item.kind === 'file') return []
  if (item.kind === 'url') {
    const title = item.title && item.title !== item.url ? [{ text: item.title }] : []
    return [...title, { text: item.url, link: item.url }]
  }
  const title = item.title ? [{ text: item.title }] : []
  return [...title, ...textParagraphs(item.text)]
}

export function buildSharedParagraphs(items: SharedItem[]): SharedParagraph[] {
  return items.flatMap(itemParagraphs)
}

function paragraphHtml(paragraph: SharedParagraph): string {
  if (!paragraph.text) return EMPTY_PARAGRAPH_HTML
  const text = escapeHtml(paragraph.text)
  return paragraph.link
    ? `<p><a href="${escapeHtml(paragraph.link)}">${text}</a></p>`
    : `<p>${text}</p>`
}

export function appendSharedParagraphsToStoredNote(noteId: string, paragraphs: SharedParagraph[]) {
  if (paragraphs.length === 0) return
  appendHtmlToStoredNote(noteId, paragraphs.map(paragraphHtml).join(''))
}

const isHeicFile = (file: SharedFileItem) =>
  HEIC_MIME_TYPES.has(file.mimeType.toLowerCase()) || HEIC_EXTENSION_PATTERN.test(file.name)

const toJpegFileName = (name: string) =>
  HEIC_EXTENSION_PATTERN.test(name)
    ? name.replace(HEIC_EXTENSION_PATTERN, JPEG_EXTENSION)
    : `${name}${JPEG_EXTENSION}`

export async function prepareSharedFileForUpload(file: SharedFileItem): Promise<SharedFileItem> {
  if (!isHeicFile(file)) return file
  try {
    const manipulator = await import('expo-image-manipulator')
    const rendered = await manipulator.ImageManipulator.manipulate(file.uri).renderAsync()
    const saved = await rendered.saveAsync({
      compress: CONVERTED_IMAGE_QUALITY,
      format: manipulator.SaveFormat.JPEG,
    })
    const info = await FileSystem.getInfoAsync(saved.uri)
    return {
      ...file,
      uri: saved.uri,
      path: toBackendPath(saved.uri),
      name: toJpegFileName(file.name),
      mimeType: JPEG_MIME_TYPE,
      size: info.exists ? (info.size ?? file.size) : file.size,
    }
  } catch {
    return file
  }
}

export function toSharedDocumentAsset(file: SharedFileItem): DocumentPickerAsset {
  return {
    uri: file.uri,
    name: file.name,
    size: file.size,
    mimeType: file.mimeType,
    lastModified: Date.now(),
  }
}
