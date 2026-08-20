export const isImageFile = (name?: string, mimeType?: string): boolean =>
  mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(name || '')

export const isAudioFile = (name?: string, mimeType?: string): boolean =>
  mimeType?.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(name || '')

export const isVideoFile = (name?: string, mimeType?: string): boolean =>
  mimeType?.startsWith('video/') || /\.(mp4|mov|m4v|mkv|webm|avi)$/i.test(name || '')

export const getAttachmentFileName = (url: string, fallback: string): string =>
  url.split('/').pop()?.split('?')[0] || fallback
