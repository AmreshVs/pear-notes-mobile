export const isImageFile = (name?: string, mimeType?: string): boolean =>
  mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(name || '')

export const isAudioFile = (name?: string, mimeType?: string): boolean =>
  mimeType?.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(name || '')

export const isVideoFile = (name?: string, mimeType?: string): boolean =>
  mimeType?.startsWith('video/') || /\.(mp4|mov|m4v|mkv|webm|avi)$/i.test(name || '')

export const getAttachmentFileName = (url: string, fallback: string): string =>
  url.split('/').pop()?.split('?')[0] || fallback

const VIDEO_MIME_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/x-m4v',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  '3gp': 'video/3gpp',
}

export const withVideoMediaType = (url: string, fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const mimeType = VIDEO_MIME_TYPES[ext]
  if (!mimeType) return url
  const type = `type=${encodeURIComponent(mimeType)}`
  if (/[?&]type=[^&]*/.test(url)) return url.replace(/([?&])type=[^&]*/, `$1${type}`)
  return `${url}${url.includes('?') ? '&' : '?'}${type}`
}
