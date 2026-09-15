import { Platform } from 'react-native'
import * as Device from 'expo-device'

import {
  LOCAL_AI_DEVICE_STATUS,
  LOCAL_AI_LIMITED_MEMORY_BYTES,
  LOCAL_AI_UNSUPPORTED_REASON,
} from '@pear-notes/core/store/services/localAiCatalog.js'

import ExpoLocalAi from '../../../modules/expo-local-ai'

const IOS_MIN_MAJOR_VERSION = 17
const ANDROID_MIN_API_LEVEL = 31
const ANDROID_REQUIRED_ABI = 'arm64-v8a'

export interface LocalAiDiskSpace {
  freeBytes: number
  totalBytes: number
}

export interface LocalAiDeviceSupport {
  status: string
  reason: string | null
  totalMemoryBytes: number
  freeDiskBytes: number
}

export async function getLocalAiDiskSpace(): Promise<LocalAiDiskSpace> {
  if (!ExpoLocalAi) return { freeBytes: 0, totalBytes: 0 }
  try {
    return await ExpoLocalAi.getDiskSpace()
  } catch {
    return { freeBytes: 0, totalBytes: 0 }
  }
}

function iosMajorVersion(): number {
  const major = Number.parseInt(String(Platform.Version).split('.')[0], 10)
  return Number.isFinite(major) ? major : 0
}

function unsupportedReason(): string | null {
  if (!ExpoLocalAi) return LOCAL_AI_UNSUPPORTED_REASON.STORE_BUILD
  if (!Device.isDevice) return LOCAL_AI_UNSUPPORTED_REASON.SIMULATOR
  if (Platform.OS === 'ios') {
    return iosMajorVersion() < IOS_MIN_MAJOR_VERSION ? LOCAL_AI_UNSUPPORTED_REASON.OS_VERSION : null
  }
  if (Platform.OS !== 'android') return LOCAL_AI_UNSUPPORTED_REASON.ARCHITECTURE
  if ((Device.platformApiLevel ?? 0) < ANDROID_MIN_API_LEVEL)
    return LOCAL_AI_UNSUPPORTED_REASON.OS_VERSION
  try {
    if (!ExpoLocalAi.is64BitProcess()) return LOCAL_AI_UNSUPPORTED_REASON.ARCHITECTURE
    if (!ExpoLocalAi.getSupportedAbis().includes(ANDROID_REQUIRED_ABI)) {
      return LOCAL_AI_UNSUPPORTED_REASON.ARCHITECTURE
    }
  } catch {
    return LOCAL_AI_UNSUPPORTED_REASON.ARCHITECTURE
  }
  return null
}

export async function getLocalAiDeviceSupport(): Promise<LocalAiDeviceSupport> {
  const totalMemoryBytes = Device.totalMemory ?? 0
  const disk = await getLocalAiDiskSpace()
  const reason = unsupportedReason()
  if (reason) {
    return {
      status: LOCAL_AI_DEVICE_STATUS.UNSUPPORTED,
      reason,
      totalMemoryBytes,
      freeDiskBytes: disk.freeBytes,
    }
  }
  const limited = totalMemoryBytes > 0 && totalMemoryBytes < LOCAL_AI_LIMITED_MEMORY_BYTES
  return {
    status: limited ? LOCAL_AI_DEVICE_STATUS.LIMITED : LOCAL_AI_DEVICE_STATUS.SUPPORTED,
    reason: null,
    totalMemoryBytes,
    freeDiskBytes: disk.freeBytes,
  }
}
