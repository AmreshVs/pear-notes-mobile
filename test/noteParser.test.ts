import { parseNoteAttachmentsAndText, resolveAttachmentFilename } from '../src/utils/noteParser'

describe('parseNoteAttachmentsAndText', () => {
  it('keeps the text and lists images and files', () => {
    const html =
      '<p>Hello &amp; welcome</p><ul><li>one</li><li>two</li></ul>' +
      '<img src="hyperdrive://a/pic" alt="x"><div url="hyperdrive://a/doc" filename="r.pdf"></div>'
    const { attachments, plainText } = parseNoteAttachmentsAndText(html)
    expect(plainText).toBe('Hello & welcome\n• one\n• two\n')
    expect(attachments.map((a) => [a.url, a.defaultExt])).toEqual([
      ['hyperdrive://a/pic', 'jpg'],
      ['hyperdrive://a/doc', 'bin'],
    ])
  })
})

describe('resolveAttachmentFilename', () => {
  it('keeps the attachment name', () => {
    expect(resolveAttachmentFilename('x://a/b', 'bin', '<div filename="Q1 &amp; Q2.pdf">')).toBe(
      'Q1 & Q2.pdf',
    )
  })

  it('takes the extension from the type, else the default', () => {
    expect(resolveAttachmentFilename('x://a/photo?type=image%2Fpng', 'jpg', '<img>')).toBe(
      'photo.png',
    )
    expect(resolveAttachmentFilename('x://a/thing', 'bin', '<div>')).toBe('thing.bin')
  })
})
