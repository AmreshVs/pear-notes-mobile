import * as LocalAuthentication from 'expo-local-authentication'

export type DeviceAuthMethod = 'face' | 'fingerprint' | 'iris' | 'passcode' | 'none'

export async function getDeviceAuthMethod(): Promise<DeviceAuthMethod> {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync()
    if (level === LocalAuthentication.SecurityLevel.NONE) return 'none'
    if (level === LocalAuthentication.SecurityLevel.SECRET) return 'passcode'
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'face'
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint'
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return 'iris'
    return 'passcode'
  } catch {
    return 'none'
  }
}

export async function isDeviceAuthSupported(): Promise<boolean> {
  return (await getDeviceAuthMethod()) !== 'none'
}

export async function authenticate(reason: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      disableDeviceFallback: false,
    })
    return result.success === true
  } catch {
    return false
  }
}
