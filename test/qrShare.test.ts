import * as FileSystem from 'expo-file-system/legacy'

import ExpoNativeShareModule from '../modules/expo-native-share'
import { shareQrImage } from '../src/lib/qrShare'

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  makeDirectoryAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
}))
jest.mock('../modules/expo-native-share', () => ({
  __esModule: true,
  default: { share: jest.fn() },
}))

const share = ExpoNativeShareModule.share as jest.Mock
const write = FileSystem.writeAsStringAsync as jest.Mock
const remove = FileSystem.deleteAsync as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  remove.mockResolvedValue(undefined)
})

describe('shareQrImage', () => {
  it('writes the image without its data-url prefix and shares it', async () => {
    share.mockResolvedValue(undefined)
    await shareQrImage('data:image/png;base64,AAAA', 'Join my vault')
    expect(write.mock.calls[0][1]).toBe('AAAA')
    expect(write.mock.calls[0][2]).toEqual({ encoding: 'base64' })
    const [{ message, urls }] = share.mock.calls[0]
    expect(message).toBe('Join my vault')
    expect(urls[0]).toMatch(/invite-qr-\d+\/pear-notes-invite\.png$/)
  })

  it('accepts a bare base64 image', async () => {
    share.mockResolvedValue(undefined)
    await shareQrImage('BBBB', 'Join')
    expect(write.mock.calls[0][1]).toBe('BBBB')
  })

  it('removes the temporary image even when sharing fails', async () => {
    share.mockRejectedValue(new Error('cancelled'))
    await expect(shareQrImage('AAAA', 'Join')).rejects.toThrow('cancelled')
    expect(remove).toHaveBeenCalledWith(expect.stringMatching(/invite-qr-\d+\/$/), {
      idempotent: true,
    })
  })
})
