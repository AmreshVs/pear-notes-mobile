import * as LocalAuthentication from 'expo-local-authentication'

import { authenticate, getDeviceAuthMethod, isDeviceAuthSupported } from '../src/lib/deviceAuth'

jest.mock('expo-local-authentication', () => ({
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
  getEnrolledLevelAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
  authenticateAsync: jest.fn(),
}))

const auth = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>

const setDevice = (level: number, types: number[] = []) => {
  auth.getEnrolledLevelAsync.mockResolvedValue(level as any)
  auth.supportedAuthenticationTypesAsync.mockResolvedValue(types as any)
}

describe('getDeviceAuthMethod', () => {
  it('is none when nothing is set up', async () => {
    setDevice(0)
    await expect(getDeviceAuthMethod()).resolves.toBe('none')
    await expect(isDeviceAuthSupported()).resolves.toBe(false)
  })

  it('is passcode when only a passcode is set', async () => {
    setDevice(1)
    await expect(getDeviceAuthMethod()).resolves.toBe('passcode')
    await expect(isDeviceAuthSupported()).resolves.toBe(true)
  })

  it('prefers face, then fingerprint, then iris', async () => {
    setDevice(3, [1, 2])
    await expect(getDeviceAuthMethod()).resolves.toBe('face')
    setDevice(3, [1])
    await expect(getDeviceAuthMethod()).resolves.toBe('fingerprint')
    setDevice(3, [3])
    await expect(getDeviceAuthMethod()).resolves.toBe('iris')
  })

  it('falls back to passcode for unknown biometrics and none on errors', async () => {
    setDevice(3, [])
    await expect(getDeviceAuthMethod()).resolves.toBe('passcode')
    auth.getEnrolledLevelAsync.mockRejectedValue(new Error('unavailable'))
    await expect(getDeviceAuthMethod()).resolves.toBe('none')
  })
})

describe('authenticate', () => {
  it('shows the reason and succeeds only on a successful result', async () => {
    auth.authenticateAsync.mockResolvedValue({ success: true } as any)
    await expect(authenticate('Unlock your notes')).resolves.toBe(true)
    expect(auth.authenticateAsync).toHaveBeenCalledWith({
      promptMessage: 'Unlock your notes',
      disableDeviceFallback: false,
    })
    auth.authenticateAsync.mockResolvedValue({ success: false, error: 'user_cancel' } as any)
    await expect(authenticate('x')).resolves.toBe(false)
  })

  it('refuses when the system throws', async () => {
    auth.authenticateAsync.mockRejectedValue(new Error('crash'))
    await expect(authenticate('x')).resolves.toBe(false)
  })
})
