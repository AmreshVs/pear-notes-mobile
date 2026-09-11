import { Directory, Paths } from 'expo-file-system'

import { backendApi } from '@pear-notes/core/backend/api.js'

import { getDbEncryptionKey } from '@/lib/secureStore'
import { withTimeout } from '@/utils/withTimeout'
import { startWorklet, terminateWorkletIfActive } from '@/utils/worklet'

const WORKLET_BOOT_LOG_PREFIX = '[worklet-boot]'
const BACKEND_READY_TIMEOUT_MS = 60_000

export const WORKLET_STORAGE_PATH = new Directory(Paths.document).uri.replace(/^file:\/+/, '/')

export async function startBackendWorkletForBackgroundTask(): Promise<any | null> {
  console.log(WORKLET_BOOT_LOG_PREFIX + ' starting')

  const encryption = await getDbEncryptionKey()
  console.log(WORKLET_BOOT_LOG_PREFIX + ' db encryption key present=' + !!encryption)
  if (!encryption) {
    console.log(WORKLET_BOOT_LOG_PREFIX + ' no vault on this device yet, nothing to sync')
    return null
  }

  const startedAt = Date.now()
  const { worklet } = await startWorklet(WORKLET_STORAGE_PATH)
  console.log(WORKLET_BOOT_LOG_PREFIX + ' worklet booted in ' + (Date.now() - startedAt) + 'ms')

  const readyAt = Date.now()
  try {
    await withTimeout(
      backendApi.ready({ storage: WORKLET_STORAGE_PATH, encryption }),
      BACKEND_READY_TIMEOUT_MS,
      'backendApi.ready',
    )
  } catch (err) {
    console.log(WORKLET_BOOT_LOG_PREFIX + ' backend never became ready', err)
    terminateWorkletIfActive(worklet)
    return null
  }
  console.log(WORKLET_BOOT_LOG_PREFIX + ' backend ready in ' + (Date.now() - readyAt) + 'ms')

  return worklet
}
