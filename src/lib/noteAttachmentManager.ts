import * as FileSystem from 'expo-file-system/legacy'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { HYPERDRIVE_URL_PREFIX } from '@pear-notes/core/constant.js'

import ExpoNativeShareModule from '../../modules/expo-native-share'

export async function pickImagesFromLibrary() {
  const ImagePicker = await import('expo-image-picker')
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    allowsEditing: false,
    allowsMultipleSelection: true,
    selectionLimit: 0,
    orderedSelection: true,
    quality: 0.8,
  })
  if (result.canceled || !result.assets?.length) {
    return null
  }
  return result.assets
}

export class CameraPermissionDeniedError extends Error {
  constructor() {
    super('CAMERA_PERMISSION_DENIED')
    this.name = 'CameraPermissionDeniedError'
  }
}

async function ensureCameraPermission(ImagePicker: typeof import('expo-image-picker')) {
  const current = await ImagePicker.getCameraPermissionsAsync()
  if (current.granted) return
  if (!current.canAskAgain) throw new CameraPermissionDeniedError()
  const requested = await ImagePicker.requestCameraPermissionsAsync()
  if (!requested.granted) throw new CameraPermissionDeniedError()
}

export async function takePhotoFromCamera() {
  const ImagePicker = await import('expo-image-picker')
  await ensureCameraPermission(ImagePicker)
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.8,
  })
  if (result.canceled || !result.assets?.[0]) {
    return null
  }
  return result.assets[0]
}

export async function takeVideoFromCamera() {
  const ImagePicker = await import('expo-image-picker')
  await ensureCameraPermission(ImagePicker)
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    allowsEditing: false,
    quality: 0.8,
  })
  if (result.canceled || !result.assets?.[0]) {
    return null
  }
  return result.assets[0]
}

export async function scanDocument() {
  const { default: DocumentScanner, ScanDocumentResponseStatus } =
    await import('react-native-document-scanner-plugin')
  const { scannedImages, status } = await DocumentScanner.scanDocument()
  if (status !== ScanDocumentResponseStatus.Success || !scannedImages?.length) {
    return null
  }
  return scannedImages
}

export async function pickDocuments() {
  const DocumentPicker = await import('expo-document-picker')
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: true,
  })
  if (result.canceled || !result.assets?.length) {
    return null
  }
  return result.assets
}

export function toBackendPath(uri: string): string {
  return decodeURIComponent(uri.replace('file://', ''))
}

export async function copyVideoToUploadCache(uri: string, fileName: string) {
  const ext = fileName.split('.').pop() || 'mp4'
  const cacheUri = `${FileSystem.cacheDirectory}upload-${Date.now()}.${ext}`
  await FileSystem.copyAsync({ from: uri, to: cacheUri })
  const info = await FileSystem.getInfoAsync(cacheUri)
  return { path: toBackendPath(cacheUri), cacheUri, size: (info as any).size || 0 }
}

export async function deleteAttachment(url: string) {
  if (!url) return
  const queryIdx = url.indexOf('?')
  let key: string | null = null
  if (queryIdx !== -1 && url.slice(queryIdx).includes('blob=')) {
    key = url.slice(queryIdx)
  } else if (url.startsWith(HYPERDRIVE_URL_PREFIX)) {
    key = url.replace(HYPERDRIVE_URL_PREFIX, '').replace(/^\//, '')
  }
  if (!key) return
  await backendApi.deleteFile(key)
}

export const ATTACHMENT_CACHE_PREFIX = 'share-'

export async function downloadToCache(
  url: string,
  fileName: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  if (url.startsWith('data:')) {
    const safeFileName = fileName || `file_${Date.now()}`
    const localUri = `${FileSystem.cacheDirectory}${ATTACHMENT_CACHE_PREFIX}${safeFileName}`
    const base64 = url.split(',')[1] || ''
    await FileSystem.writeAsStringAsync(localUri, base64, { encoding: 'base64' })
    return localUri
  }
  const ext = fileName.split('.').pop() || 'bin'
  const dest = `${FileSystem.cacheDirectory}${ATTACHMENT_CACHE_PREFIX}${Date.now()}.${ext}`
  if (!onProgress) {
    const { uri } = await FileSystem.downloadAsync(url, dest)
    return uri
  }
  const resumable = FileSystem.createDownloadResumable(
    url,
    dest,
    {},
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      if (totalBytesExpectedToWrite > 0) {
        onProgress(Math.min(100, Math.round((totalBytesWritten / totalBytesExpectedToWrite) * 100)))
      }
    },
  )
  const result = await resumable.downloadAsync()
  if (!result) throw new Error('Download failed')
  return result.uri
}

export async function saveImageToPhotos(url: string, fileName: string) {
  const localUri = await downloadToCache(url, fileName)
  try {
    await ExpoNativeShareModule.saveToPhotos({ url: localUri })
  } finally {
    await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {})
  }
}

export async function previewAttachment(url: string, fileName: string) {
  const localUri = await downloadToCache(url, fileName)
  try {
    await ExpoNativeShareModule.preview({ url: localUri })
  } finally {
    await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {})
  }
}

export async function shareAttachment(url: string, fileName: string) {
  const localUri = await downloadToCache(url, fileName)
  try {
    await ExpoNativeShareModule.share({ message: '', urls: [localUri], resolveOnDismiss: true })
  } finally {
    await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {})
  }
}

export async function shareMessage(message: string, urls: string[] = []) {
  await ExpoNativeShareModule.share({ message, urls })
}

export async function copyFileToSAF(sourceUri: string, destUri: string) {
  await ExpoNativeShareModule.copyFile({ sourceUri, destUri })
}
