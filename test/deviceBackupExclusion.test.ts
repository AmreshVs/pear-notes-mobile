import { Platform } from 'react-native'

import * as log from '@pear-notes/core/log.js'

import { excludeFromBackup } from '../modules/expo-backup-exclusion'
import { excludeFromDeviceBackups } from '../src/lib/deviceBackupExclusion'

jest.mock('../modules/expo-backup-exclusion', () => ({ excludeFromBackup: jest.fn() }))
jest.mock('@pear-notes/core/log.js', () => ({ error: jest.fn() }))

const exclude = excludeFromBackup as jest.Mock

beforeEach(() => jest.clearAllMocks())
afterEach(() => jest.restoreAllMocks())

describe('excludeFromDeviceBackups', () => {
  it('asks iOS to keep the storage out of iCloud backups', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios')
    exclude.mockResolvedValue(true)
    await excludeFromDeviceBackups('/vault')
    expect(exclude).toHaveBeenCalledWith('/vault')
    expect(log.error).not.toHaveBeenCalled()
  })

  it('logs when the system did not exclude it, and when it throws', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios')
    exclude.mockResolvedValue(false)
    await excludeFromDeviceBackups('/vault')
    expect(log.error).toHaveBeenCalledTimes(1)
    exclude.mockRejectedValue(new Error('x'))
    await expect(excludeFromDeviceBackups('/vault')).resolves.toBeUndefined()
    expect(log.error).toHaveBeenCalledTimes(2)
  })

  it('does nothing on Android', async () => {
    jest.replaceProperty(Platform, 'OS', 'android')
    await excludeFromDeviceBackups('/vault')
    expect(exclude).not.toHaveBeenCalled()
  })
})
