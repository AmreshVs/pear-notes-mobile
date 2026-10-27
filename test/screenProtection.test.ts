import { allowScreenCaptureAsync, preventScreenCaptureAsync } from 'expo-screen-capture'

import {
  disableScreenshotProtection,
  enableScreenshotProtection,
} from '../src/lib/screenProtection'

jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: jest.fn(),
  allowScreenCaptureAsync: jest.fn(),
}))

describe('screenshot protection', () => {
  it('blocks and allows capture with the same tag', async () => {
    await enableScreenshotProtection()
    await disableScreenshotProtection()
    expect(preventScreenCaptureAsync).toHaveBeenCalledWith('locked-note')
    expect(allowScreenCaptureAsync).toHaveBeenCalledWith('locked-note')
  })

  it('never throws when the system refuses', async () => {
    const prevent = preventScreenCaptureAsync as jest.Mock
    prevent.mockRejectedValueOnce(new Error('x'))
    await expect(enableScreenshotProtection()).resolves.toBeUndefined()
  })
})
