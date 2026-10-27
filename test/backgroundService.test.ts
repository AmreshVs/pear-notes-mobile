const mockNativeService = {
  start: jest.fn(),
  update: jest.fn(),
  stop: jest.fn(),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  isIgnoringBatteryOptimizations: jest.fn(),
  openBatteryOptimizationSettings: jest.fn(),
}
const mockIosRefresh = { isBackgroundRefreshAllowed: jest.fn() }

function loadFor(os: 'ios' | 'android') {
  jest.resetModules()
  jest.doMock('expo-modules-core', () => ({
    requireNativeModule: () => mockNativeService,
    requireOptionalNativeModule: () => mockIosRefresh,
  }))
  jest.doMock('react-native', () => ({ Platform: { OS: os } }))
  return require('../modules/expo-background-service/src') as typeof import('../modules/expo-background-service/src')
}

beforeAll(() => {
  loadFor('ios')
})

beforeEach(() => jest.clearAllMocks())
afterEach(() => jest.restoreAllMocks())

describe('background service on Android', () => {
  it('passes the notification text and progress to the service', () => {
    const service = loadFor('android')
    service.startService('Syncing', 'Starting', 10)
    service.updateService('Syncing', 3, 'Halfway', 10)
    service.stopService()
    service.stopService('Done', 'All synced')
    expect(mockNativeService.start).toHaveBeenCalledWith('Syncing', 'Starting', 10)
    expect(mockNativeService.update).toHaveBeenCalledWith('Syncing', 3, 'Halfway', 10)
    expect(mockNativeService.stop.mock.calls).toEqual([
      [null, null],
      ['Done', 'All synced'],
    ])
  })

  it('assumes battery optimisation is fine unless the system says otherwise', () => {
    const service = loadFor('android')
    mockNativeService.isIgnoringBatteryOptimizations.mockReturnValue(false)
    expect(service.isIgnoringBatteryOptimizations()).toBe(false)
    mockNativeService.isIgnoringBatteryOptimizations.mockReturnValue(true)
    expect(service.isIgnoringBatteryOptimizations()).toBe(true)
    mockNativeService.isIgnoringBatteryOptimizations.mockImplementation(() => {
      throw new Error('x')
    })
    expect(service.isIgnoringBatteryOptimizations()).toBe(true)
  })

  it('does not crash opening the settings screen when it is missing', () => {
    const service = loadFor('android')
    mockNativeService.openBatteryOptimizationSettings.mockImplementation(() => {
      throw new Error('x')
    })
    expect(() => service.openBatteryOptimizationSettings()).not.toThrow()
  })

  it('forwards stop events to listeners', () => {
    const service = loadFor('android')
    const listener = jest.fn()
    service.addServiceStoppedListener(listener)
    expect(mockNativeService.addListener).toHaveBeenCalledWith('onServiceStopped', listener)
  })
})

describe('background service on iOS', () => {
  it('has nothing to do with battery settings or the service', () => {
    const service = loadFor('ios')
    expect(service.isIgnoringBatteryOptimizations()).toBe(true)
    service.openBatteryOptimizationSettings()
    expect(mockNativeService.openBatteryOptimizationSettings).not.toHaveBeenCalled()
    expect(service.addServiceStoppedListener(jest.fn()).remove).toBeInstanceOf(Function)
    expect(mockNativeService.addListener).not.toHaveBeenCalled()
  })

  it('reports whether Background App Refresh is allowed, assuming yes on errors', async () => {
    const service = loadFor('ios')
    mockIosRefresh.isBackgroundRefreshAllowed.mockResolvedValue(false)
    await expect(service.isBackgroundRefreshAllowed()).resolves.toBe(false)
    mockIosRefresh.isBackgroundRefreshAllowed.mockResolvedValue(true)
    await expect(service.isBackgroundRefreshAllowed()).resolves.toBe(true)
    mockIosRefresh.isBackgroundRefreshAllowed.mockRejectedValue(new Error('x'))
    await expect(service.isBackgroundRefreshAllowed()).resolves.toBe(true)
  })

  it('assumes yes on Android', async () => {
    const service = loadFor('android')
    await expect(service.isBackgroundRefreshAllowed()).resolves.toBe(true)
  })
})
