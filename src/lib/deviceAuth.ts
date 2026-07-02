import * as LocalAuthentication from 'expo-local-authentication'

export async function isDeviceAuthSupported(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync()
    const isEnrolled = await LocalAuthentication.isEnrolledAsync()
    return hasHardware && isEnrolled
  } catch {
    return false
  }
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
