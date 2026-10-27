import { getDownloadStatusKey } from '../src/utils/transferStatus'

const download = (extra: object) => ({ sourceOnline: true, status: 'downloading', ...extra }) as any

describe('getDownloadStatusKey', () => {
  it('tells the user why a download is stuck', () => {
    expect(getDownloadStatusKey(download({ sourceOnline: false }))).toBe('storage.waitingForDevice')
    expect(getDownloadStatusKey(download({ status: 'paused' }))).toBe('storage.paused')
    expect(getDownloadStatusKey(download({ status: 'error' }))).toBe('storage.transferFailed')
    expect(getDownloadStatusKey(download({ stalled: true }))).toBe('storage.stalled')
  })

  it('shows nothing for a healthy download', () => {
    expect(getDownloadStatusKey(download({}))).toBeNull()
  })
})
