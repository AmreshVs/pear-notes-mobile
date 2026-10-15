import * as FileSystem from 'expo-file-system/legacy'

import { hasFileExtension } from '@/lib/fileSignature'
import { copyFileToSAF, downloadToCache, shareMessage } from '@/lib/noteAttachmentManager'

import ExpoNativeShareModule from '../../modules/expo-native-share'

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  avif: 'image/avif',
  bmp: 'image/bmp',
  pdf: 'application/pdf',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  zip: 'application/zip',
}

const FALLBACK_MIME_TYPE = 'application/octet-stream'

function applyDownloadedExtension(fileName: string, localPath: string): string {
  if (hasFileExtension(fileName)) return fileName
  const localName = localPath.split('/').pop() || ''
  if (!hasFileExtension(localName)) return fileName
  return `${fileName}.${localName.split('.').pop()}`
}

export async function previewAttachmentFile(
  url: string,
  fileName: string,
  onProgress: (progress: number) => void,
) {
  const localUri = await downloadToCache(url, fileName, onProgress)
  await ExpoNativeShareModule.preview({ url: localUri })
}

export async function shareAttachmentFile(url: string, fileName: string) {
  const localUri = await downloadToCache(url, fileName)
  await shareMessage('', [localUri])
}

export async function saveAttachmentFile(_kind: string, url: string, fileName: string) {
  const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync()
  if (!permissions.granted) return
  const localPath = await downloadToCache(url, fileName)
  const targetName = applyDownloadedExtension(fileName, localPath)
  const ext = targetName.split('.').pop()?.toLowerCase() || ''
  const uri = await FileSystem.StorageAccessFramework.createFileAsync(
    permissions.directoryUri,
    targetName,
    MIME_TYPES[ext] || FALLBACK_MIME_TYPE,
  )
  await copyFileToSAF(localPath, uri)
}
