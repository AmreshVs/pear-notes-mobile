import {
  getAttachmentFileName,
  isAudioFile,
  isImageFile,
  isVideoFile,
  withVideoMediaType,
} from '../src/utils/media'

describe('file kind detection', () => {
  it('detects by mime type or by extension', () => {
    expect(isImageFile('photo.HEIC')).toBe(true)
    expect(isImageFile('x', 'image/png')).toBe(true)
    expect(isAudioFile('voice.m4a')).toBe(true)
    expect(isVideoFile('clip.mov')).toBe(true)
    expect(isImageFile('notes.pdf')).toBe(false)
  })
})

describe('getAttachmentFileName', () => {
  it('takes the last path part without the query', () => {
    expect(getAttachmentFileName('hyperdrive://a/b/clip.mp4?x=1', 'file')).toBe('clip.mp4')
    expect(getAttachmentFileName('', 'file')).toBe('file')
  })
})

describe('withVideoMediaType', () => {
  it('adds the video type to the url', () => {
    expect(withVideoMediaType('x://a/clip.mov', 'clip.mov')).toBe(
      'x://a/clip.mov?type=video%2Fquicktime',
    )
    expect(withVideoMediaType('x://a/clip?k=1', 'clip.mp4')).toBe('x://a/clip?k=1&type=video%2Fmp4')
  })

  it('replaces an existing type and ignores unknown extensions', () => {
    expect(withVideoMediaType('x://a/c?type=bad', 'c.webm')).toBe('x://a/c?type=video%2Fwebm')
    expect(withVideoMediaType('x://a/c.txt', 'c.txt')).toBe('x://a/c.txt')
  })
})
