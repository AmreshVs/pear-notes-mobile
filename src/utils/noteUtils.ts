export type AttachmentKind = 'image' | 'video' | 'audio' | 'file' | 'mixed'

export interface AttachmentInfo {
  kind: AttachmentKind
  count: number
}

const PREVIEW_LIMIT = 100

const BLOCK_BOUNDARY_REGEX = /<\/(?:p|div|h[1-6]|li|blockquote|pre|tr|figcaption)>|<br\s*\/?>/gi

const NAMED_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;|&apos;/g, (match) => NAMED_ENTITIES[match])
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

export function getPreview(html: string, fallback = ''): string {
  if (!html) return fallback
  const text = decodeHtmlEntities(html.replace(BLOCK_BOUNDARY_REGEX, ' ').replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return fallback
  return text.length > PREVIEW_LIMIT ? text.substring(0, PREVIEW_LIMIT) + '…' : text
}

const FILE_ATTACHMENT_TAG_REGEX = /<div\b[^>]*\bdata-file-attachment\b[^>]*>/gi
const FILETYPE_ATTR_REGEX = /\bfiletype\s*=\s*"([^"]*)"/i

export function getAttachmentInfo(html: string): AttachmentInfo | null {
  if (!html) return null

  let image = (html.match(/<img\b/gi) || []).length
  let video = 0
  let audio = (html.match(/\bdata-audio-attachment\b/gi) || []).length
  let file = 0

  const fileTags = html.match(FILE_ATTACHMENT_TAG_REGEX) || []
  for (const tag of fileTags) {
    const type = (tag.match(FILETYPE_ATTR_REGEX)?.[1] || '').toLowerCase()
    if (type.startsWith('image/')) image++
    else if (type.startsWith('video/')) video++
    else if (type.startsWith('audio/')) audio++
    else file++
  }

  const total = image + video + audio + file
  if (total === 0) return null

  const kindsPresent = [image, video, audio, file].filter((count) => count > 0).length
  if (kindsPresent > 1) return { kind: 'mixed', count: total }
  if (image) return { kind: 'image', count: image }
  if (video) return { kind: 'video', count: video }
  if (audio) return { kind: 'audio', count: audio }
  return { kind: 'file', count: file }
}

export function getFirstImageUrl(html: string): string | undefined {
  if (!html) return undefined
  const divMatch =
    html.match(/<div[^>]*filetype="image\/[^"]*"[^>]*url="([^"]+)"[^>]*>/) ||
    html.match(/<div[^>]*url="([^"]+)"[^>]*filetype="image\/[^"]*"[^>]*>/)
  if (divMatch?.[1]) return divMatch[1].replace(/&amp;/g, '&')
  const imgMatch = html.match(/<img[^>]+src="([^"]+)"/)
  if (imgMatch?.[1]) return imgMatch[1].replace(/&amp;/g, '&')
  return undefined
}

export function isChecklistNote(html: string): boolean {
  return !!html && html.includes('data-type="taskItem"')
}
