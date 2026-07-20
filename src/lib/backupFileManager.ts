import { Platform, Share } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { File } from 'expo-file-system'
import * as FileSystemLegacy from 'expo-file-system/legacy'

export class InvalidBackupFileError extends Error {
  constructor() {
    super('InvalidBackupFile')
  }
}

export function getTempBackupFilePath(): string {
  const cacheDir = FileSystemLegacy.cacheDirectory ?? ''
  return cacheDir.replace('file://', '') + 'temp_export.pnbk'
}

export function getBackupFileName(): string {
  const date = new Date().toISOString().split('T')[0]
  return `pear-notes-${date}.pnbk`
}

function renameBackupInCache(exportFilePath: string): string {
  const fileUri = (FileSystemLegacy.cacheDirectory ?? '') + getBackupFileName()
  const destFile = new File(fileUri)
  if (destFile.exists) destFile.delete()
  new File(exportFilePath).copy(destFile)
  return fileUri
}

function deleteFileIfExists(path: string): void {
  try {
    const file = new File(path)
    if (file.exists) file.delete()
  } catch {}
}

export function clearBackupExportCache(exportFilePath: string): void {
  deleteFileIfExists(exportFilePath)
  deleteFileIfExists((FileSystemLegacy.cacheDirectory ?? '') + getBackupFileName())
}

export async function sweepBackupCache(): Promise<void> {
  const cacheDir = FileSystemLegacy.cacheDirectory ?? ''
  if (!cacheDir) return
  try {
    const entries = await FileSystemLegacy.readDirectoryAsync(cacheDir)
    await Promise.all(
      entries
        .filter(
          (name) =>
            name === 'temp_export.pnbk' ||
            (name.startsWith('pear-notes-') && name.endsWith('.pnbk')),
        )
        .map((name) => FileSystemLegacy.deleteAsync(cacheDir + name, { idempotent: true })),
    )
    const pickerDir = cacheDir + 'DocumentPicker'
    const info = await FileSystemLegacy.getInfoAsync(pickerDir)
    if (info.exists) await FileSystemLegacy.deleteAsync(pickerDir, { idempotent: true })
  } catch {}
}

let lastImportCachePath: string | null = null

export function rememberImportCacheFile(path: string): void {
  lastImportCachePath = path
}

export function clearImportCacheFile(): void {
  if (!lastImportCachePath) return
  deleteFileIfExists(lastImportCachePath)
  lastImportCachePath = null
}

const SAF_DOCUMENTS_INITIAL_URI =
  'content://com.android.externalstorage.documents/document/primary%3ADocuments'

export async function saveBackupToDevice(exportFilePath: string): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      const result = await Share.share({ url: renameBackupInCache(exportFilePath) })
      return result.action !== Share.dismissedAction
    }
    const permissions =
      await FileSystemLegacy.StorageAccessFramework.requestDirectoryPermissionsAsync(
        SAF_DOCUMENTS_INITIAL_URI,
      )
    if (!permissions.granted) return false
    const uri = await FileSystemLegacy.StorageAccessFramework.createFileAsync(
      permissions.directoryUri,
      getBackupFileName(),
      'application/octet-stream',
    )
    const srcFile = new File(exportFilePath)
    const destFile = new File(uri)
    srcFile.copy(destFile)
    return true
  } finally {
    clearBackupExportCache(exportFilePath)
  }
}

export async function saveBackupWithShare(
  exportFilePath: string,
  shareMessage?: string,
): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      const result = await Share.share({ url: renameBackupInCache(exportFilePath) })
      return result.action !== Share.dismissedAction
    }
    const result = await Share.share({ message: shareMessage, url: exportFilePath })
    return result.action !== Share.dismissedAction
  } finally {
    clearBackupExportCache(exportFilePath)
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

export function backupUriToPath(uri: string): string {
  return decodeURIComponent(uri.replace('file://', ''))
}
