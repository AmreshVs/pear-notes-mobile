import { Platform, Share } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { Directory, File } from 'expo-file-system'
import * as FileSystemLegacy from 'expo-file-system/legacy'

import { backendApi } from '@pear-notes/core/backend/api.js'

const LEGACY_TEMP_BACKUP_NAME = 'temp_export.pnbk'

export class InvalidBackupFileError extends Error {
  constructor() {
    super('InvalidBackupFile')
  }
}

export class EmptyBackupFileError extends Error {
  constructor() {
    super('EmptyBackupFile')
  }
}

function getCacheDirectory(): string {
  return FileSystemLegacy.cacheDirectory ?? ''
}

function getBackupFileName(): string {
  const date = new Date().toISOString().split('T')[0]
  return `pear-notes-${date}.pnbk`
}

export function getBackupExportPath(): string {
  return getCacheDirectory().replace('file://', '') + getBackupFileName()
}

function toFileUri(path: string): string {
  return path.startsWith('/') ? `file://${path}` : path
}

function openExportedBackup(exportFilePath: string): File {
  const file = new File(toFileUri(exportFilePath))
  if (!file.exists || file.size <= 0) throw new EmptyBackupFileError()
  return file
}

function deleteFileIfExists(path: string): void {
  try {
    const file = new File(toFileUri(path))
    if (file.exists) file.delete()
  } catch {}
}

export function clearBackupExportCache(exportFilePath: string): void {
  deleteFileIfExists(exportFilePath)
  deleteFileIfExists(getCacheDirectory() + LEGACY_TEMP_BACKUP_NAME)
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
            name === LEGACY_TEMP_BACKUP_NAME ||
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
    const source = openExportedBackup(exportFilePath)
    if (Platform.OS === 'ios') {
      const result = await Share.share({ url: toFileUri(exportFilePath) })
      return result.action !== Share.dismissedAction
    }
    const permissions =
      await FileSystemLegacy.StorageAccessFramework.requestDirectoryPermissionsAsync(
        SAF_DOCUMENTS_INITIAL_URI,
      )
    if (!permissions.granted) return false
    await source.copy(new Directory(permissions.directoryUri), { overwrite: true })
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
    openExportedBackup(exportFilePath)
    if (Platform.OS === 'ios') {
      const result = await Share.share({ url: toFileUri(exportFilePath) })
      return result.action !== Share.dismissedAction
    }
    const result = await Share.share({ message: shareMessage, url: toFileUri(exportFilePath) })
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

export type RestoreOutdatedDevice = {
  title?: string
}

export async function findRestoreOutdatedDevices(
  filePath: string,
): Promise<RestoreOutdatedDevice[]> {
  try {
    const check = await backendApi.checkBackupRestore({ buffer: null, filePath })
    return check.sealed ? check.blocking : []
  } catch (e) {
    console.error('findRestoreOutdatedDevices', e)
    return []
  }
}
