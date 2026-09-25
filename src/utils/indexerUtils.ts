import { INDEXER_ERROR, INDEXER_TRANSFER_STEP } from '@pear-notes/core/constant.js'

const INDEXER_ERROR_KEYS: Record<string, string> = {
  [INDEXER_ERROR.LAST_INDEXER]: 'sync.devices.errorLastIndexer',
  [INDEXER_ERROR.DEVICE_OFFLINE]: 'sync.devices.errorDeviceOffline',
  [INDEXER_ERROR.LEADER_OFFLINE]: 'sync.devices.errorLeaderOffline',
  [INDEXER_ERROR.MAX_LEADERS]: 'sync.devices.errorMaxLeaders',
  [INDEXER_ERROR.UNKNOWN_DEVICE]: 'sync.devices.errorGeneric',
  [INDEXER_ERROR.TRANSFER_TIMEOUT]: 'sync.devices.errorTransferTimeout',
}

const INDEXER_STEP_KEYS: Record<string, string> = {
  [INDEXER_TRANSFER_STEP.SUBMITTING]: 'sync.devices.transferSubmitting',
  [INDEXER_TRANSFER_STEP.CONFIRMING]: 'sync.devices.transferConfirming',
}

export function getIndexerStepKey(step?: string | null): string {
  if (!step) return 'sync.devices.transferring'
  return INDEXER_STEP_KEYS[step] || 'sync.devices.transferring'
}

export function getIndexerErrorKey(error?: string | null): string {
  if (!error) return ''
  return INDEXER_ERROR_KEYS[error] || 'sync.devices.errorGeneric'
}

export function getLeaderModalCopy(
  t: (key: string, options?: any) => string,
  mode: 'add' | 'remove',
  isLocalTarget: boolean,
  name: string,
) {
  if (mode === 'remove') {
    return {
      title: isLocalTarget
        ? t('sync.devices.removeIndexerTitleLocal')
        : t('sync.devices.removeIndexerTitle', { name }),
      body: t('sync.devices.removeIndexerBody'),
      confirm: t('sync.devices.removeIndexerConfirm'),
    }
  }
  return {
    title: isLocalTarget
      ? t('sync.devices.makeIndexerTitleLocal')
      : t('sync.devices.makeIndexerTitle', { name }),
    body: isLocalTarget
      ? t('sync.devices.makeIndexerBodyLocal')
      : t('sync.devices.makeIndexerBody', { name }),
    confirm: t('sync.devices.makeIndexerConfirm'),
  }
}
