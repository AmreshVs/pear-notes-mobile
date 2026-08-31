import * as FileSystem from 'expo-file-system/legacy'

import ExpoNativeShareModule from '../../modules/expo-native-share'

const QR_CACHE_DIR_PREFIX = 'invite-qr-'

export class QrImageUnreadableError extends Error {
  constructor() {
    super('QR_IMAGE_UNREADABLE')
    this.name = 'QrImageUnreadableError'
  }
}

export class QrCodeNotFoundError extends Error {
  constructor() {
    super('QR_CODE_NOT_FOUND')
    this.name = 'QrCodeNotFoundError'
  }
}

async function createQrCacheDir(): Promise<string> {
  const dir = `${FileSystem.cacheDirectory}${QR_CACHE_DIR_PREFIX}${Date.now()}/`
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true })
  return dir
}

export async function shareQrImage(base64Png: string, message: string) {
  const dir = await createQrCacheDir()
  const dest = `${dir}pear-notes-invite.png`
  const payload = base64Png.includes(',') ? base64Png.slice(base64Png.indexOf(',') + 1) : base64Png
  await FileSystem.writeAsStringAsync(dest, payload, { encoding: 'base64' })
  try {
    await ExpoNativeShareModule.share({ message, urls: [dest], resolveOnDismiss: true })
  } finally {
    await FileSystem.deleteAsync(dir, { idempotent: true }).catch(() => {})
  }
}

export async function readInviteFromQrImage(): Promise<string | null> {
  const ImagePicker = await import('expo-image-picker')
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: false,
    quality: 1,
  })
  if (result.canceled || !result.assets?.[0]?.uri) return null

  const { scanFromURLAsync } = await import('expo-camera')
  let scanned
  try {
    scanned = await scanFromURLAsync(result.assets[0].uri, ['qr'])
  } catch {
    throw new QrImageUnreadableError()
  }
  const data = scanned?.[0]?.data?.trim()
  if (!data) throw new QrCodeNotFoundError()
  return data
}
