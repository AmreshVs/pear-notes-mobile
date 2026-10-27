import { backendApi } from '@pear-notes/core/backend/api.js'

import { getHoldMediaOnCellular } from '../src/lib/mediaSyncPolicy'

jest.mock('@pear-notes/core/backend/api.js', () => ({ backendApi: { getPreference: jest.fn() } }))

const getPreference = backendApi.getPreference as unknown as jest.Mock

describe('getHoldMediaOnCellular', () => {
  it('is on only when the saved preference is "true"', async () => {
    getPreference.mockResolvedValueOnce('true')
    await expect(getHoldMediaOnCellular()).resolves.toBe(true)
    getPreference.mockResolvedValueOnce('false')
    await expect(getHoldMediaOnCellular()).resolves.toBe(false)
  })

  it('is off when the preference cannot be read', async () => {
    getPreference.mockRejectedValueOnce(new Error('backend not ready'))
    await expect(getHoldMediaOnCellular()).resolves.toBe(false)
  })
})
