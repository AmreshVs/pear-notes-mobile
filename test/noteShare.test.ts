import { downloadToCache } from '../src/lib/noteAttachmentManager'
import { buildNoteSharePayload } from '../src/lib/noteShare'

jest.mock('../src/lib/noteAttachmentManager', () => ({ downloadToCache: jest.fn() }))

const download = downloadToCache as jest.Mock

describe('buildNoteSharePayload', () => {
  beforeEach(() => download.mockReset())

  it('shares the title and text with downloaded attachments', async () => {
    download.mockImplementation(async (_url: string, name: string) => `file:///cache/${name}`)
    const payload = await buildNoteSharePayload({
      title: 'Trip',
      html: '<p>Pack bags</p><img src="http://hyperdrive/a/pic.png">',
    })
    expect(payload.message).toBe('Trip\n\nPack bags')
    expect(payload.urls).toEqual(['file:///cache/pic.png'])
  })

  it('shares only the text for an untitled note and skips failed downloads', async () => {
    download.mockRejectedValue(new Error('offline'))
    const payload = await buildNoteSharePayload({
      title: '',
      html: '<p>Hello</p><img src="http://hyperdrive/a/pic.png">',
    })
    expect(payload).toEqual({ message: 'Hello', urls: [] })
  })

  it('asks the backend to resolve attachment links', async () => {
    download.mockResolvedValue('file:///cache/x')
    const resolve = jest.fn((url: string) =>
      url.replace('http://hyperdrive', 'http://127.0.0.1:1/x'),
    )
    await buildNoteSharePayload({
      title: 't',
      html: '<img src="http://hyperdrive/a/pic.png&amp;k=1">',
      resolveHyperdriveUrl: resolve,
    })
    expect(download.mock.calls[0][0]).toBe('http://127.0.0.1:1/x/a/pic.png&k=1')
  })
})
