import { ATTACHMENT_KIND } from '@pear-notes/core/store/services/noteAttachments.js'

import {
  cleanupCachedAttachment,
  downloadToCache,
  saveImageToPhotos,
  shareAttachment,
} from '@/lib/noteAttachmentManager'

import ExpoNativeShareModule from '../../modules/expo-native-share'

export async function previewAttachmentFile(
  url: string,
  fileName: string,
  onProgress: (progress: number) => void,
) {
  const localUri = await downloadToCache(url, fileName, onProgress)
  try {
    await ExpoNativeShareModule.preview({ url: localUri })
  } finally {
    await cleanupCachedAttachment(localUri)
  }
}

export const shareAttachmentFile = (url: string, fileName: string) => shareAttachment(url, fileName)

export async function saveAttachmentFile(kind: string, url: string, fileName: string) {
  if (kind === ATTACHMENT_KIND.PHOTO) return saveImageToPhotos(url, fileName)
  return shareAttachment(url, fileName)
}
