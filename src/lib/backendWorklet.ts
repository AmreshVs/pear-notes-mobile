import { Directory, Paths } from 'expo-file-system'

import { backendApi } from '@pear-notes/core/backend/api.js'
import * as log from '@pear-notes/core/log.js'

import { getDbEncryptionKey, getVaultEntropy } from '@/lib/secureStore'
import { withTimeout } from '@/utils/withTimeout'
import { startWorklet, terminateWorkletIfActive } from '@/utils/worklet'

const WORKLET_BOOT_LOG_PREFIX = '[worklet-boot]'
const BACKEND_READY_TIMEOUT_MS = 60_000

export const WORKLET_STORAGE_PATH = new Directory(Paths.document).uri.replace(/^file:\/+/, '/')

export async function startBackendWorkletForBackgroundTask(): Promise<any | null> {
  log.info(WORKLET_BOOT_LOG_PREFIX + ' starting')

  const encryption = await getDbEncryptionKey()
  log.info(WORKLET_BOOT_LOG_PREFIX + ' db encryption key present=' + !!encryption)
  if (!encryption) {
    log.info(WORKLET_BOOT_LOG_PREFIX + ' no vault on this device yet, nothing to sync')
    return null
  }

  const entropy = await getVaultEntropy()

  const startedAt = Date.now()
  const { worklet } = await startWorklet(WORKLET_STORAGE_PATH)
  log.info(WORKLET_BOOT_LOG_PREFIX + ' worklet booted in ' + (Date.now() - startedAt) + 'ms')

  const readyAt = Date.now()
  try {
    await withTimeout(
      backendApi.ready({ storage: WORKLET_STORAGE_PATH, encryption, entropy }),
      BACKEND_READY_TIMEOUT_MS,
      'backendApi.ready',
    )
  } catch (err) {
    log.error(WORKLET_BOOT_LOG_PREFIX + ' backend never became ready', err)
    terminateWorkletIfActive(worklet)
    return null
  }
  log.info(WORKLET_BOOT_LOG_PREFIX + ' backend ready in ' + (Date.now() - readyAt) + 'ms')

  return worklet
}
