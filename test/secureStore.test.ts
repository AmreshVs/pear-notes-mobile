const mockKeychain = new Map<string, string>()
const mockSlot = (name: string, options?: { keychainService?: string }) =>
  `${options?.keychainService ?? ''}|${name}`

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'afterFirstUnlockThisDeviceOnly',
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'whenPasscodeSetThisDeviceOnly',
  getItemAsync: jest.fn(
    async (name: string, options?: any) => mockKeychain.get(mockSlot(name, options)) ?? null,
  ),
  setItemAsync: jest.fn(async (name: string, value: string, options?: any) => {
    mockKeychain.set(mockSlot(name, options), value)
  }),
  deleteItemAsync: jest.fn(async (name: string, options?: any) => {
    mockKeychain.delete(mockSlot(name, options))
  }),
  canUseBiometricAuthentication: jest.fn(() => true),
}))

function loadFor(os: 'ios' | 'android') {
  let store!: typeof import('../src/lib/secureStore')
  jest.isolateModules(() => {
    jest.replaceProperty(require('react-native').Platform, 'OS', os)
    store = require('../src/lib/secureStore')
  })
  return store
}

beforeEach(() => mockKeychain.clear())
afterEach(() => jest.restoreAllMocks())

describe('secureStore on iOS', () => {
  it('keeps the key in the this-device-only mockKeychain service and reads it back', async () => {
    const store = loadFor('ios')
    await store.setDbEncryptionKey('abc')
    expect(mockKeychain.get('pear-notes-this-device|db_encryption_key')).toBe('abc')
    await expect(store.getDbEncryptionKey()).resolves.toBe('abc')
  })

  it('moves a key from an older mockKeychain service and removes the old copy', async () => {
    mockKeychain.set('pear-notes-after-first-unlock|db_encryption_key', 'old')
    const store = loadFor('ios')
    await expect(store.getDbEncryptionKey()).resolves.toBe('old')
    expect(mockKeychain.get('pear-notes-this-device|db_encryption_key')).toBe('old')
    expect(mockKeychain.has('pear-notes-after-first-unlock|db_encryption_key')).toBe(false)
  })

  it('removes older copies when a new key is saved', async () => {
    mockKeychain.set('|db_encryption_key', 'ancient')
    const store = loadFor('ios')
    await store.setDbEncryptionKey('new')
    expect(mockKeychain.has('|db_encryption_key')).toBe(false)
  })

  it('clears the key and entropy everywhere', async () => {
    const store = loadFor('ios')
    await store.setDbEncryptionKey('k')
    await store.setVaultEntropy('e')
    await store.clearVaultSecrets()
    await expect(store.getDbEncryptionKey()).resolves.toBeNull()
    await expect(store.getVaultEntropy()).resolves.toBeNull()
    expect(mockKeychain.size).toBe(0)
  })

  it('returns null when nothing is stored', async () => {
    await expect(loadFor('ios').getDbEncryptionKey()).resolves.toBeNull()
  })
})

describe('secureStore on Android', () => {
  it('uses the default store without iOS mockKeychain options', async () => {
    const store = loadFor('android')
    await store.setVaultEntropy('e')
    expect(mockKeychain.get('|vault_entropy')).toBe('e')
    await expect(store.getVaultEntropy()).resolves.toBe('e')
  })
})

describe('biometric lock key', () => {
  it('is stored under a cleaned vault id in its own service', async () => {
    const store = loadFor('ios')
    await store.setLockRootKey('vault/../1', 'root')
    expect(mockKeychain.get('pear-notes-lock-root|lock_root_vault..1')).toBe('root')
    await expect(store.getLockRootKey('vault/../1', 'Unlock')).resolves.toBe('root')
    await store.deleteLockRootKey('vault/../1')
    expect(mockKeychain.size).toBe(0)
  })

  it('reports whether biometric storage is possible', () => {
    expect(loadFor('ios').canUseBiometricSecret()).toBe(true)
  })
})

describe('isKeychainLockedError', () => {
  it('recognises the locked-mockKeychain message', () => {
    const { isKeychainLockedError } = loadFor('ios')
    expect(isKeychainLockedError(new Error('User interaction is not allowed.'))).toBe(true)
    expect(isKeychainLockedError('other')).toBe(false)
  })
})
