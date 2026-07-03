import { Buffer } from 'buffer'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { HYPERDRIVE_URL_PREFIX } from '@pear-notes/core/constant.js'
import * as FileSystem from 'expo-file-system/legacy'

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

export async function takePhotoFromCamera() {
  const ImagePicker = await import('expo-image-picker')
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

export async function uploadVideo(noteId: string, uri: string, fileName: string) {
  const ext = fileName.split('.').pop() || 'mp4'
  const cachePath = `${FileSystem.cacheDirectory}upload-${Date.now()}.${ext}`
  await FileSystem.copyAsync({ from: uri, to: cachePath })
  const info = await FileSystem.getInfoAsync(cachePath)
  const fileSize = (info as any).size || 0
  const { link } = await backendApi.insertFile({
    key: noteId,
    fileName,
    path: decodeURIComponent(cachePath.replace('file://', '')),
  } as any)
  await FileSystem.deleteAsync(cachePath, { idempotent: true })
  return { link, size: fileSize }
}

export async function uploadImage(noteId: string, uri: string, fileName: string) {
  const base64Data = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' })
  const buffer = Buffer.from(base64Data, 'base64')
  const { link } = await backendApi.insertFile({
    key: noteId,
    fileName,
    buffer,
  } as any)
  return { link }
}

export async function uploadDocumentFile(noteId: string, uri: string, fileName: string) {
  const { link } = await backendApi.insertFile({
    key: noteId,
    fileName,
    path: decodeURIComponent(uri.replace('file://', '')),
  } as any)
  return { link }
}

export async function uploadRecording(noteId: string, uri: string, fileName: string) {
  const { link } = await backendApi.insertFile({
    key: noteId,
    fileName,
    path: decodeURIComponent(uri.replace('file://', '')),
  } as any)
  return { link }
}

export async function deleteAttachment(url: string) {
  if (url.startsWith(HYPERDRIVE_URL_PREFIX)) {
    const key = url.replace(HYPERDRIVE_URL_PREFIX, '').replace(/^\//, '')
    await backendApi.deleteFile(key)
  }
}

export async function downloadToCache(url: string, fileName: string): Promise<string> {
  if (url.startsWith('data:')) {
    const safeFileName = fileName || `file_${Date.now()}`
    const localUri = `${FileSystem.cacheDirectory}${safeFileName}`
    const base64 = url.split(',')[1] || ''
    await FileSystem.writeAsStringAsync(localUri, base64, { encoding: 'base64' })
    return localUri
  }
  const ext = fileName.split('.').pop() || 'bin'
  const dest = `${FileSystem.cacheDirectory}share-${Date.now()}.${ext}`
  const { uri } = await FileSystem.downloadAsync(url, dest)
  return uri
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
