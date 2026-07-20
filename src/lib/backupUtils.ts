import { Buffer } from 'buffer'

import * as FileSystem from 'expo-file-system/legacy'

export const LAST_BACKUP_FILE = (FileSystem.documentDirectory ?? '') + 'lastBackup.json'

export function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
  return hex.length === 7 ? `${hex}${a}` : hex
}

const HYPERDRIVE_URL_PREFIX = 'http://hyperdrive'

export function getMediaDisplayName(name: string, fallback: string): string {
  if (!name || name.startsWith(HYPERDRIVE_URL_PREFIX)) return fallback
  return name
}

export function uint8ArrayToBase64(buffer: Uint8Array): string {
  return Buffer.from(buffer).toString('base64')
}

export function toUint8Array(data: any): Uint8Array {
  if (!data) return new Uint8Array(0)
  if (data instanceof Uint8Array) return data
  if (typeof data === 'object') {
    if (data.type === 'Buffer' && Array.isArray(data.data)) {
      return new Uint8Array(data.data)
    }
    if ('data' in data && Array.isArray(data.data)) {
      return new Uint8Array(data.data)
    }
    if (Array.isArray(data)) {
      return new Uint8Array(data)
    }
    const keys = Object.keys(data)
    if (keys.length > 0 && keys.every((k) => !isNaN(Number(k)))) {
      return new Uint8Array(Object.values(data))
    }
  }
  return new Uint8Array(data)
}

export async function saveLastBackupDate(): Promise<void> {
  await FileSystem.writeAsStringAsync(
    LAST_BACKUP_FILE,
    JSON.stringify({ date: new Date().toISOString() }),
  )
}

export async function loadLastBackupDate(): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(LAST_BACKUP_FILE)
    if (info.exists) {
      const content = await FileSystem.readAsStringAsync(LAST_BACKUP_FILE)
      return JSON.parse(content).date
    }
  } catch {}
  return null
}

export function formatBackupDate(iso: string): string {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) +
    ' • ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  )
}
