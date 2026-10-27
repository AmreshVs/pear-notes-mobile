import {
  buildSharedParagraphs,
  countSharedItemCategories,
  getSharedItemCategory,
} from '../src/lib/sharedContent'

jest.mock('expo-file-system/legacy', () => ({}))
jest.mock('../src/lib/noteAttachmentManager', () => ({ toBackendPath: jest.fn() }))
jest.mock('../src/lib/noteUploadManager', () => ({
  appendHtmlToStoredNote: jest.fn(),
  escapeHtml: (value: string) => value,
}))

const file = (name: string, mimeType = '') =>
  ({ kind: 'file', name, mimeType, uri: `file:///${name}` }) as any
const link = (url: string, title = '') => ({ kind: 'url', url, title }) as any
const text = (body: string, title = '') => ({ kind: 'text', text: body, title }) as any

describe('getSharedItemCategory', () => {
  it('sorts shared things into photo, video, audio, file, link and text', () => {
    expect(getSharedItemCategory(file('a.jpg'))).toBe('photo')
    expect(getSharedItemCategory(file('a', 'video/mp4'))).toBe('video')
    expect(getSharedItemCategory(file('a.m4a'))).toBe('audio')
    expect(getSharedItemCategory(file('a.pdf'))).toBe('file')
    expect(getSharedItemCategory(link('https://x.com'))).toBe('link')
    expect(getSharedItemCategory(text('hi'))).toBe('text')
  })
})

describe('countSharedItemCategories', () => {
  it('counts per category in a fixed order', () => {
    const counts = countSharedItemCategories([text('a'), file('a.jpg'), file('b.png'), link('u')])
    expect(counts).toEqual([
      ['photo', 2],
      ['link', 1],
      ['text', 1],
    ])
  })
})

describe('buildSharedParagraphs', () => {
  it('turns shared text into paragraphs without leading or double blank lines', () => {
    const paragraphs = buildSharedParagraphs([text('\n\nfirst\n\n\nsecond  \n')])
    expect(paragraphs).toEqual([{ text: 'first' }, { text: '' }, { text: 'second' }])
  })

  it('keeps a link and shows its title only when different from the url', () => {
    expect(buildSharedParagraphs([link('https://x.com', 'X')])).toEqual([
      { text: 'X' },
      { text: 'https://x.com', link: 'https://x.com' },
    ])
    expect(buildSharedParagraphs([link('https://x.com', 'https://x.com')])).toEqual([
      { text: 'https://x.com', link: 'https://x.com' },
    ])
  })

  it('ignores files', () => {
    expect(buildSharedParagraphs([file('a.jpg')])).toEqual([])
  })
})
