import { Platform } from 'react-native'
import * as Device from 'expo-device'

/**
 * The name this device is stored under once it is linked to a vault.
 *
 * `Device.deviceName` is the name the user gave the device ("Amresh's iPhone"). iOS 16 and
 * later withhold it from apps without the entitlement and hand back the model name instead,
 * and it is null on some Android builds, so fall back through the model name to the platform.
 */
export function getLocalDeviceName(): string {
  return Device.deviceName || Device.modelName || Platform.OS
}
