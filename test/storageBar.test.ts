import { DEVICE_STORAGE } from '@pear-notes/core/store/services/deviceStorage.js'

import { getDeviceStorageBreakdown, type VaultUsage } from '../src/utils/storageBar'

const vault = (id: string, bytes: number, current = false) =>
  ({ id, name: id, bytes, current }) as unknown as VaultUsage

describe('getDeviceStorageBreakdown', () => {
  it('separates vault data, app data and AI models', () => {
    const summary = {
      byCategory: {
        [DEVICE_STORAGE.NOTES]: 600,
        [DEVICE_STORAGE.APP]: 300,
        [DEVICE_STORAGE.CACHE]: 100,
        [DEVICE_STORAGE.AI_MODELS]: 1000,
      },
    } as any
    const result = getDeviceStorageBreakdown(summary, [vault('a', 600, true)], false)
    expect(result.appBytes).toBe(400)
    expect(result.aiBytes).toBe(1000)
    expect(result.cacheBytes).toBe(100)
    expect(result.showAi).toBe(true)
    expect(result.segments.map((s) => s.tone)).toEqual(['openVault', 'ai', 'app'])
  })

  it('has no segments when empty and hides AI until models exist', () => {
    expect(getDeviceStorageBreakdown(null, [], false)).toMatchObject({
      segments: [],
      showAi: false,
    })
    expect(getDeviceStorageBreakdown(null, [], true).showAi).toBe(true)
  })

  it('keeps tiny segments visible', () => {
    const summary = {
      byCategory: { [DEVICE_STORAGE.NOTES]: 1, [DEVICE_STORAGE.AI_MODELS]: 1_000_000 },
    } as any
    const result = getDeviceStorageBreakdown(summary, [vault('a', 1, true)], false)
    expect(result.segments.every((s) => s.share >= 0.015)).toBe(true)
  })
})
