import * as FileSystem from 'expo-file-system/legacy'

import { consumeSharePayloads, discardSharePayloads, readShareInbox } from '../src/lib/shareInbox'

const mockDocs = 'file:///docs/'
const mockInbox = `${mockDocs}share-intake/`
const mockFiles = new Map<
  string,
  { content?: string; size?: number; mtime?: number; dir?: boolean }
>()

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  readDirectoryAsync: jest.fn(async (dir: string) => {
    const names = new Set<string>()
    for (const path of mockFiles.keys()) {
      if (path.startsWith(dir) && path !== dir) names.add(path.slice(dir.length).split('/')[0])
    }
    return [...names]
  }),
  readAsStringAsync: jest.fn(async (path: string) => {
    const file = mockFiles.get(path)
    if (!file || file.content === undefined) throw new Error('missing')
    return file.content
  }),
  getInfoAsync: jest.fn(async (path: string) => {
    const file = mockFiles.get(path)
    if (!file) return { exists: false }
    return {
      exists: true,
      isDirectory: file.dir === true,
      size: file.size,
      modificationTime: file.mtime,
    }
  }),
  deleteAsync: jest.fn(async (path: string) => {
    for (const key of [...mockFiles.keys()])
      if (key === path || key.startsWith(path)) mockFiles.delete(key)
  }),
}))
jest.mock('../src/lib/noteAttachmentManager', () => ({
  toBackendPath: (uri: string) => uri.replace('file://', ''),
}))
jest.mock('../modules/expo-share-intake', () => ({ __esModule: true, default: {} }))

const UNSAFE_URL = `${'java'}script:alert(1)`

const nowSeconds = () => Date.now() / 1000

function addShare(id: string, manifest: object | string, files: Record<string, number> = {}) {
  const directory = `${mockInbox}${id}/`
  mockFiles.set(directory, { dir: true, mtime: nowSeconds() })
  mockFiles.set(`${directory}manifest.json`, {
    content: typeof manifest === 'string' ? manifest : JSON.stringify(manifest),
  })
  for (const [name, size] of Object.entries(files)) {
    mockFiles.set(`${directory}${encodeURIComponent(name)}`, { size })
  }
  return directory
}

const manifest = (items: object[], extra: object = {}) => ({
  version: 1,
  createdAt: 100,
  skipped: 0,
  items,
  ...extra,
})

beforeEach(() => mockFiles.clear())

describe('readShareInbox', () => {
  it('is empty when nothing was shared', async () => {
    await expect(readShareInbox()).resolves.toEqual([])
  })

  it('reads shared text, links and files from the share extension', async () => {
    addShare(
      'a',
      manifest([
        { kind: 'text', text: 'Hello', title: ' Note ' },
        { kind: 'url', url: 'https://example.com', title: 'Example' },
        { kind: 'file', file: 'photo.jpg', mimeType: 'image/jpeg', size: 5 },
      ]),
      { 'photo.jpg': 2048 },
    )
    const [payload] = await readShareInbox()
    expect(payload.items.map((item) => item.kind)).toEqual(['text', 'url', 'file'])
    expect(payload.items[0]).toMatchObject({ text: 'Hello', title: 'Note', id: 'a:0' })
    expect(payload.items[2]).toMatchObject({
      name: 'photo.jpg',
      mimeType: 'image/jpeg',
      size: 2048,
    })
  })

  it('treats a non-web "url" as plain text', async () => {
    addShare(
      'a',
      manifest([
        { kind: 'url', url: UNSAFE_URL },
        { kind: 'url', url: '  ' },
      ]),
    )
    const [payload] = await readShareInbox()
    expect(payload.items).toHaveLength(1)
    expect(payload.items[0]).toMatchObject({ kind: 'text', text: UNSAFE_URL })
  })

  it('drops blank text and unknown kinds', async () => {
    addShare(
      'a',
      manifest([{ kind: 'text', text: '   ' }, { kind: 'mystery' }, { kind: 'text', text: 'ok' }]),
    )
    const [payload] = await readShareInbox()
    expect(payload.items.map((item) => item.kind)).toEqual(['text'])
  })

  it('refuses file names that could escape the share folder', async () => {
    addShare(
      'a',
      manifest([
        { kind: 'file', file: '../secret.txt' },
        { kind: 'file', file: 'sub/dir.txt' },
        { kind: 'file', file: '..' },
        { kind: 'file', file: 'manifest.json' },
        { kind: 'file', file: 'good.txt' },
      ]),
      { 'good.txt': 10 },
    )
    const [payload] = await readShareInbox()
    expect(payload.items.map((item) => (item as { name: string }).name)).toEqual(['good.txt'])
  })

  it('skips files that are missing from disk', async () => {
    addShare(
      'a',
      manifest([
        { kind: 'file', file: 'gone.txt' },
        { kind: 'text', text: 'kept' },
      ]),
    )
    const [payload] = await readShareInbox()
    expect(payload.items).toHaveLength(1)
  })

  it('removes shares with a broken or unsupported manifest', async () => {
    const broken = addShare('a', '{not json')
    const wrongVersion = addShare('b', { version: 99, items: [] })
    await expect(readShareInbox()).resolves.toEqual([])
    expect(mockFiles.has(broken)).toBe(false)
    expect(mockFiles.has(wrongVersion)).toBe(false)
  })

  it('removes shares that end up with nothing usable', async () => {
    const directory = addShare('a', manifest([{ kind: 'file', file: '../x' }]))
    await expect(readShareInbox()).resolves.toEqual([])
    expect(mockFiles.has(directory)).toBe(false)
  })

  it('returns older shares first', async () => {
    addShare('new', manifest([{ kind: 'text', text: 'b' }], { createdAt: 200 }))
    addShare('old', manifest([{ kind: 'text', text: 'a' }], { createdAt: 100 }))
    const payloads = await readShareInbox()
    expect(payloads.map((payload) => payload.id)).toEqual(['old', 'new'])
  })

  it('cleans up abandoned shares that never got a manifest, but not fresh ones', async () => {
    const abandoned = `${mockInbox}stale/`
    mockFiles.set(abandoned, { dir: true, mtime: nowSeconds() - 25 * 60 * 60 })
    const fresh = `${mockInbox}fresh/`
    mockFiles.set(fresh, { dir: true, mtime: nowSeconds() })
    await readShareInbox()
    expect(mockFiles.has(abandoned)).toBe(false)
    expect(mockFiles.has(fresh)).toBe(true)
  })
})

describe('consuming and discarding shares', () => {
  it('consuming removes only the manifest so the files stay for the upload', async () => {
    const directory = addShare('a', manifest([{ kind: 'file', file: 'a.txt' }]), { 'a.txt': 1 })
    const payloads = await readShareInbox()
    await consumeSharePayloads(payloads)
    expect(mockFiles.has(`${directory}manifest.json`)).toBe(false)
    expect(mockFiles.has(`${directory}a.txt`)).toBe(true)
  })

  it('discarding removes the whole share', async () => {
    const directory = addShare('a', manifest([{ kind: 'text', text: 'x' }]))
    const payloads = await readShareInbox()
    await discardSharePayloads(payloads)
    expect(mockFiles.has(directory)).toBe(false)
    expect(FileSystem.deleteAsync).toHaveBeenCalled()
  })
})
