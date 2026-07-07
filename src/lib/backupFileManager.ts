import * as DocumentPicker from 'expo-document-picker'
import { File } from 'expo-file-system'
import * as FileSystemLegacy from 'expo-file-system/legacy'
import { Platform, Share } from 'react-native'

export class InvalidBackupFileError extends Error {
  constructor() {
    super('InvalidBackupFile')
  }
}

export function getTempBackupFilePath(): string {
  const cacheDir = FileSystemLegacy.cacheDirectory ?? ''
  return cacheDir.replace('file://', '') + 'temp_export.pnbk'
}

export async function saveBackupToDevice(exportFilePath: string): Promise<void> {
  const date = new Date().toISOString().split('T')[0]
  const filename = `pear-notes-${date}.pnbk`

  if (Platform.OS === 'ios') {
    const fileUri = (FileSystemLegacy.cacheDirectory ?? '') + filename
    const srcFile = new File(exportFilePath)
    const destFile = new File(fileUri)
    srcFile.copy(destFile)
    await Share.share({ url: fileUri })
  } else {
    const permissions =
      await FileSystemLegacy.StorageAccessFramework.requestDirectoryPermissionsAsync()
    if (permissions.granted) {
      const uri = await FileSystemLegacy.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        filename,
        'application/octet-stream',
      )
      const srcFile = new File(exportFilePath)
      const destFile = new File(uri)
      srcFile.copy(destFile)
    }
  }
}

export async function saveBackupWithShare(
  exportFilePath: string,
  shareMessage?: string,
): Promise<void> {
  if (Platform.OS === 'ios') {
    await Share.share({ url: exportFilePath })
  } else {
    await Share.share({ message: shareMessage, url: exportFilePath })
  }
}

export type PickedBackupFile = {
  uri: string
  name: string
}

export async function pickBackupFile(): Promise<PickedBackupFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  })
  if (result.canceled) return null
  const asset = result.assets[0]
  const name = asset.name || asset.uri.split('/').pop() || ''
  if (!name.endsWith('.pnbk') && !name.endsWith('.pearnotes')) {
    throw new InvalidBackupFileError()
  }
  return { uri: asset.uri, name }
}

export async function readBackupFile(uri: string): Promise<Uint8Array> {
  const file = new File(uri)
  return await file.bytes()
}
