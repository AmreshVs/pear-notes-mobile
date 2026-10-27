import { outdatedDeviceMeta } from '../src/utils/deviceSeen'

const t = ((key: string, options?: { version?: string; count?: number }) =>
  options ? `${key}:${options.version ?? options.count}` : key) as any

const DAY = 86_400_000

describe('outdatedDeviceMeta', () => {
  const now = 100 * DAY

  it('shows the version and when the device was last seen', () => {
    expect(outdatedDeviceMeta({ appVersion: '1.0.0', lastSeenAt: now - 3 * DAY }, t, now)).toBe(
      'settings.privacy.outdatedDeviceVersion:1.0.0 · settings.privacy.outdatedDeviceSeen:3',
    )
  })

  it('says today for a device seen today', () => {
    expect(outdatedDeviceMeta({ lastSeenAt: now - 1000 }, t, now)).toBe(
      'settings.privacy.outdatedDeviceSeenToday',
    )
  })

  it('is empty when nothing is known', () => {
    expect(outdatedDeviceMeta({}, t, now)).toBe('')
  })
})
