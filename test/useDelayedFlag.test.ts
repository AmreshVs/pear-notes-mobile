import { act, renderHook } from '@testing-library/react-native'

import { useDelayedFlag } from '../src/hooks/useDelayedFlag'

describe('useDelayedFlag', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('turns on only after the delay', async () => {
    const { result } = await renderHook(() => useDelayedFlag(500))
    expect(result.current).toBe(false)
    await act(async () => {
      jest.advanceTimersByTime(499)
    })
    expect(result.current).toBe(false)
    await act(async () => {
      jest.advanceTimersByTime(1)
    })
    expect(result.current).toBe(true)
  })

  it('never turns on if the screen goes away first', async () => {
    const { result, unmount } = await renderHook(() => useDelayedFlag(500))
    await unmount()
    await act(async () => {
      jest.advanceTimersByTime(1000)
    })
    expect(result.current).toBe(false)
  })
})
