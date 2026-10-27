import { INDEXER_ERROR } from '@pear-notes/core/constant.js'

import {
  getIndexerErrorKey,
  getIndexerStepKey,
  getLeaderModalCopy,
} from '../src/utils/indexerUtils'

const t = (key: string, options?: { name?: string }) =>
  options?.name ? `${key}:${options.name}` : key

describe('leader change messages', () => {
  it('maps errors, with a generic fallback', () => {
    expect(getIndexerErrorKey(INDEXER_ERROR.LAST_INDEXER)).toBe('sync.devices.errorLastIndexer')
    expect(getIndexerErrorKey('new-error')).toBe('sync.devices.errorGeneric')
    expect(getIndexerErrorKey(null)).toBe('')
  })

  it('shows "transferring" for unknown steps', () => {
    expect(getIndexerStepKey(undefined)).toBe('sync.devices.transferring')
  })
})

describe('getLeaderModalCopy', () => {
  it('words the dialog for this device or another device', () => {
    expect(getLeaderModalCopy(t, 'add', true, 'Mac').title).toBe(
      'sync.devices.makeIndexerTitleLocal',
    )
    expect(getLeaderModalCopy(t, 'add', false, 'Mac').title).toBe(
      'sync.devices.makeIndexerTitle:Mac',
    )
    expect(getLeaderModalCopy(t, 'remove', true, 'Mac').confirm).toBe(
      'sync.devices.removeIndexerConfirm',
    )
  })
})
