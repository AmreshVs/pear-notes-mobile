import { isPluggedInState } from '../src/lib/battery'

const battery = {
  BatteryState: { UNKNOWN: 0, UNPLUGGED: 1, CHARGING: 2, FULL: 3, NOT_CHARGING: 4 },
} as any

describe('isPluggedInState', () => {
  it('counts charging, full and not-charging as plugged in', () => {
    expect(isPluggedInState(battery, 2)).toBe(true)
    expect(isPluggedInState(battery, 3)).toBe(true)
    expect(isPluggedInState(battery, 4)).toBe(true)
  })

  it('does not count unplugged or unknown', () => {
    expect(isPluggedInState(battery, 1)).toBe(false)
    expect(isPluggedInState(battery, 0)).toBe(false)
  })
})
