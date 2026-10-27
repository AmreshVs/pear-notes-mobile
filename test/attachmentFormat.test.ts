import { ATTACHMENT_KIND } from '@pear-notes/core/store/services/noteAttachments.js'

import { attachmentDetail, attachmentName } from '../src/utils/attachmentFormat'

const t = ((key: string) => key) as any

describe('attachmentName', () => {
  it('uses the file name, else a label for the kind', () => {
    expect(attachmentName({ fileName: 'plan.pdf', kind: ATTACHMENT_KIND.PHOTO } as any, t)).toBe(
      'plan.pdf',
    )
    expect(attachmentName({ kind: ATTACHMENT_KIND.AUDIO } as any, t)).toBe(
      'attachmentsView.recording',
    )
    expect(attachmentName({ kind: 'other' } as any, t)).toBe('attachmentsView.file')
  })
})

describe('attachmentDetail', () => {
  it('shows a recording length as m:ss after the note title', () => {
    const item = { kind: ATTACHMENT_KIND.AUDIO, duration: 125, title: 'Meeting' } as any
    expect(attachmentDetail(item, t, 'en')).toBe('Meeting · 2:05')
  })

  it('falls back to an untitled note', () => {
    expect(attachmentDetail({ kind: ATTACHMENT_KIND.PHOTO } as any, t, 'en')).toBe(
      'noteCard.untitled',
    )
  })
})
