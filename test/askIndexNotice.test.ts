import { askIndexNoticeText } from '../src/utils/askIndexNotice'

const t = ((key: string, options?: object) =>
  options ? `${key} ${JSON.stringify(options)}` : key) as any

describe('askIndexNoticeText', () => {
  it('shows progress while indexing, or a start message before the total is known', () => {
    expect(askIndexNoticeText(t, { kind: 'indexing', done: 3, total: 10 })).toContain('"done":3')
    expect(askIndexNoticeText(t, { kind: 'indexing', done: 0, total: 0 })).toBe(
      'localAi.askVault.indexNotice.indexingStart',
    )
  })

  it('explains waiting to charge and failures', () => {
    expect(askIndexNoticeText(t, { kind: 'charging', total: 40 })).toContain('"count":40')
    expect(askIndexNoticeText(t, { kind: 'waiting' })).toBe('localAi.askVault.indexNotice.waiting')
    expect(askIndexNoticeText(t, { kind: 'failed' })).toBe('localAi.askVault.indexNotice.failed')
  })
})
