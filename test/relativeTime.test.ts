import { getRelativeTime } from '../src/utils/relativeTime'

describe('getRelativeTime', () => {
  const now = 10 * 86_400_000

  it('steps from just now to minutes, hours and days', () => {
    expect(getRelativeTime(now - 5_000, now)).toEqual({ key: 'sync.confirm.justNow', count: 0 })
    expect(getRelativeTime(now - 3 * 60_000, now)).toEqual({
      key: 'sync.confirm.minutesAgo',
      count: 3,
    })
    expect(getRelativeTime(now - 5 * 3_600_000, now)).toEqual({
      key: 'sync.confirm.hoursAgo',
      count: 5,
    })
    expect(getRelativeTime(now - 2 * 86_400_000, now)).toEqual({
      key: 'sync.confirm.daysAgo',
      count: 2,
    })
  })

  it('shows nothing when never synced', () => {
    expect(getRelativeTime(0, now)).toBeNull()
  })
})
