import * as FileSystem from 'expo-file-system/legacy'

import {
  detectFileExtension,
  ensureFileExtension,
  hasFileExtension,
} from '../src/lib/fileSignature'

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(),
  moveAsync: jest.fn(),
}))

const read = FileSystem.readAsStringAsync as jest.Mock
const move = FileSystem.moveAsync as jest.Mock

const header = (bytes: number[]) => {
  const padded = [...bytes, ...new Array(Math.max(0, 24 - bytes.length)).fill(0)]
  read.mockResolvedValueOnce(Buffer.from(padded).toString('base64'))
}
const ascii = (text: string) => Array.from(Buffer.from(text, 'latin1'))

describe('detectFileExtension', () => {
  it('recognises common file types by their first bytes', async () => {
    header([0xff, 0xd8, 0xff, 0xe0])
    await expect(detectFileExtension('f')).resolves.toBe('jpg')
    header([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    await expect(detectFileExtension('f')).resolves.toBe('png')
    header(ascii('%PDF-1.7'))
    await expect(detectFileExtension('f')).resolves.toBe('pdf')
  })

  it('recognises iPhone photos and videos', async () => {
    header([0, 0, 0, 0x18, ...ascii('ftypheic')])
    await expect(detectFileExtension('f')).resolves.toBe('heic')
    header([0, 0, 0, 0x18, ...ascii('ftypqt  ')])
    await expect(detectFileExtension('f')).resolves.toBe('mov')
    header([0, 0, 0, 0x18, ...ascii('ftypisom')])
    await expect(detectFileExtension('f')).resolves.toBe('mp4')
  })

  it('recognises RIFF audio and images', async () => {
    header([...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')])
    await expect(detectFileExtension('f')).resolves.toBe('webp')
    header([...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WAVE')])
    await expect(detectFileExtension('f')).resolves.toBe('wav')
  })

  it('gives up on unknown or unreadable files', async () => {
    header(ascii('plain text file...'))
    await expect(detectFileExtension('f')).resolves.toBeNull()
    read.mockRejectedValueOnce(new Error('gone'))
    await expect(detectFileExtension('f')).resolves.toBeNull()
  })
})

describe('ensureFileExtension', () => {
  beforeEach(() => move.mockReset())

  it('leaves files that already have an extension', async () => {
    await expect(ensureFileExtension('file:///a/photo.jpg')).resolves.toBe('file:///a/photo.jpg')
    expect(move).not.toHaveBeenCalled()
    expect(hasFileExtension('photo.jpg')).toBe(true)
    expect(hasFileExtension('photo')).toBe(false)
  })

  it('renames a file with no extension to the detected type', async () => {
    header(ascii('%PDF-1.7'))
    await expect(ensureFileExtension('file:///a/scan')).resolves.toBe('file:///a/scan.pdf')
    expect(move).toHaveBeenCalledWith({ from: 'file:///a/scan', to: 'file:///a/scan.pdf' })
  })

  it('keeps the original name if the rename fails', async () => {
    header(ascii('%PDF-1.7'))
    move.mockRejectedValueOnce(new Error('denied'))
    await expect(ensureFileExtension('file:///a/scan')).resolves.toBe('file:///a/scan')
  })
})
