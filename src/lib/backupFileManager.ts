import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { Platform, Share } from 'react-native'

import { toUint8Array, uint8ArrayToBase64 } from '@/lib/backupUtils'

export class InvalidBackupFileError extends Error {
  constructor() {
    super('InvalidBackupFile')
  }
}

export async function saveBackupToDevice(exportBuffer: any): Promise<void> {
  const uint8 = toUint8Array(exportBuffer)
  const base64 = uint8ArrayToBase64(uint8)
  const date = new Date().toISOString().split('T')[0]
  const filename = `pear-notes-${date}.pnbk`

  if (Platform.OS === 'ios') {
    const fileUri = (FileSystem.cacheDirectory ?? '') + filename
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    })
    await Share.share({ url: fileUri })
  } else {
    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync()
    if (permissions.granted) {
      const uri = await FileSystem.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        filename,
        'application/octet-stream',
      )
      await FileSystem.writeAsStringAsync(uri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      })
    }
  }
}

export async function saveBackupWithShare(exportBuffer: any, shareMessage?: string): Promise<void> {
  const uint8 = toUint8Array(exportBuffer)
  const base64 = uint8ArrayToBase64(uint8)
  const tempFile = (FileSystem.cacheDirectory ?? '') + 'backup.pearnotes'
  await FileSystem.writeAsStringAsync(tempFile, base64, {
    encoding: FileSystem.EncodingType.Base64,
  })
  if (Platform.OS === 'ios') {
    await Share.share({ url: tempFile })
  } else {
    await Share.share({ message: shareMessage, url: tempFile })
  }
}

export async function pickBackupFilePath(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  })
  if (result.canceled) return null
  const asset = result.assets[0]
  if (!asset.name?.endsWith('.pnbk')) {
    throw new InvalidBackupFileError()
  }
  const decodedUri = decodeURI(asset.uri)
  return decodedUri.startsWith('file://') ? decodedUri.replace('file://', '') : decodedUri
}

export async function pickAnyFilePath(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true })
  if (result.canceled) return null
  const file = result.assets[0]
  const decodedUri = decodeURIComponent(file.uri)
  return decodedUri.startsWith('file://') ? decodedUri.replace('file://', '') : decodedUri
}
