import { clearStorageState } from '../src/lib/clearStorageState'

describe('clearStorageState', () => {
  afterEach(() => clearStorageState.setClearing(false))

  it('tells subscribers when clearing starts and stops', () => {
    const listener = jest.fn()
    const unsubscribe = clearStorageState.subscribe(listener)
    clearStorageState.setClearing(true)
    expect(clearStorageState.getClearing()).toBe(true)
    clearStorageState.setClearing(false)
    expect(listener.mock.calls).toEqual([[true], [false]])
    unsubscribe()
    clearStorageState.setClearing(true)
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
