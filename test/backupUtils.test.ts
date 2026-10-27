import {
  formatBackupDate,
  getMediaDisplayName,
  hexWithAlpha,
  toUint8Array,
} from '../src/lib/backupUtils'

jest.mock('expo-file-system/legacy', () => ({ documentDirectory: 'file:///docs/' }))

describe('hexWithAlpha', () => {
  it('appends the alpha channel to full hex colors', () => {
    expect(hexWithAlpha('#112233', 0.5)).toBe('#11223380')
    expect(hexWithAlpha('#112233', 1)).toBe('#112233ff')
    expect(hexWithAlpha('#112233', 0)).toBe('#11223300')
  })

  it('leaves other color formats alone', () => {
    expect(hexWithAlpha('#123', 0.5)).toBe('#123')
    expect(hexWithAlpha('red', 0.5)).toBe('red')
  })
})

describe('getMediaDisplayName', () => {
  it('hides internal hyperdrive urls behind the fallback', () => {
    expect(getMediaDisplayName('http://hyperdrive/abc', 'Photo')).toBe('Photo')
    expect(getMediaDisplayName('', 'Photo')).toBe('Photo')
    expect(getMediaDisplayName('holiday.jpg', 'Photo')).toBe('holiday.jpg')
  })
})

describe('toUint8Array', () => {
  it('accepts the shapes bytes arrive in over the bridge', () => {
    expect(Array.from(toUint8Array(null))).toEqual([])
    expect(Array.from(toUint8Array(new Uint8Array([1, 2])))).toEqual([1, 2])
    expect(Array.from(toUint8Array({ type: 'Buffer', data: [3, 4] }))).toEqual([3, 4])
    expect(Array.from(toUint8Array({ data: [5] }))).toEqual([5])
    expect(Array.from(toUint8Array({ 0: 6, 1: 7 }))).toEqual([6, 7])
    expect(Array.from(toUint8Array([8, 9]))).toEqual([8, 9])
  })
})

describe('formatBackupDate', () => {
  it('shows a readable date and time', () => {
    expect(formatBackupDate('2026-03-05T14:30:00')).toMatch(/^March 5, 2026 • 0?2:30/)
  })
})
