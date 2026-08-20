import { Buffer } from 'buffer'
import * as FileSystem from 'expo-file-system/legacy'

const HEADER_READ_LENGTH = 24
const MIN_HEADER_LENGTH = 12

type ByteSignature = {
  offset: number
  bytes: number[]
  extension: string
}

const BYTE_SIGNATURES: ByteSignature[] = [
  { offset: 0, bytes: [0xff, 0xd8, 0xff], extension: 'jpg' },
  { offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], extension: 'png' },
  { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38], extension: 'gif' },
  { offset: 0, bytes: [0x42, 0x4d], extension: 'bmp' },
  { offset: 0, bytes: [0x25, 0x50, 0x44, 0x46], extension: 'pdf' },
  { offset: 0, bytes: [0x49, 0x44, 0x33], extension: 'mp3' },
  { offset: 0, bytes: [0x4f, 0x67, 0x67, 0x53], extension: 'ogg' },
  { offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3], extension: 'webm' },
  { offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04], extension: 'zip' },
]

const RIFF_FORMAT_EXTENSIONS: Record<string, string> = {
  WEBP: 'webp',
  WAVE: 'wav',
  AVI: 'avi',
}

const FTYP_BRAND_EXTENSIONS: Record<string, string> = {
  heic: 'heic',
  heix: 'heic',
  hevc: 'heic',
  heim: 'heic',
  mif1: 'heic',
  msf1: 'heic',
  avif: 'avif',
  M4A: 'm4a',
  M4V: 'm4v',
  qt: 'mov',
}

const DEFAULT_FTYP_EXTENSION = 'mp4'
const RIFF_TAG = 'RIFF'
const FTYP_TAG = 'ftyp'

export function hasFileExtension(fileName: string): boolean {
  return /\.[a-z0-9]{1,8}$/i.test(fileName)
}

function matchesSignature(header: Buffer, signature: ByteSignature): boolean {
  return signature.bytes.every((byte, index) => header[signature.offset + index] === byte)
}

function resolveContainerExtension(header: Buffer): string | null {
  if (header.toString('latin1', 0, 4) === RIFF_TAG) {
    return RIFF_FORMAT_EXTENSIONS[header.toString('latin1', 8, 12).trim()] ?? null
  }
  if (header.toString('latin1', 4, 8) === FTYP_TAG) {
    return FTYP_BRAND_EXTENSIONS[header.toString('latin1', 8, 12).trim()] ?? DEFAULT_FTYP_EXTENSION
  }
  return null
}

export async function detectFileExtension(fileUri: string): Promise<string | null> {
  try {
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'base64',
      position: 0,
      length: HEADER_READ_LENGTH,
    })
    const header = Buffer.from(base64, 'base64')
    if (header.length < MIN_HEADER_LENGTH) return null
    const matched = BYTE_SIGNATURES.find((signature) => matchesSignature(header, signature))
    if (matched) return matched.extension
    return resolveContainerExtension(header)
  } catch {
    return null
  }
}

export async function ensureFileExtension(fileUri: string): Promise<string> {
  const fileName = fileUri.split('/').pop() || ''
  if (hasFileExtension(fileName)) return fileUri
  const extension = await detectFileExtension(fileUri)
  if (!extension) return fileUri
  const target = `${fileUri}.${extension}`
  try {
    await FileSystem.moveAsync({ from: fileUri, to: target })
  } catch {
    return fileUri
  }
  return target
}
