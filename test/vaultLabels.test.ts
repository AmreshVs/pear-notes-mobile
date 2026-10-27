import { VAULT_ERROR } from '@pear-notes/core/constant.js'

import { getVaultErrorKey, getVaultInitial, getVaultLabel } from '../src/lib/vaultLabels'

const key = ((k: string) => k) as any

describe('vault labels', () => {
  it('falls back to the default name', () => {
    expect(getVaultLabel({ name: 'Work' } as any, key)).toBe('Work')
    expect(getVaultLabel({ name: '' } as any, key)).toBe('vaults.defaultName')
    expect(getVaultLabel(null, key)).toBe('vaults.defaultName')
  })

  it('uses the first letter as the initial', () => {
    expect(getVaultInitial('  work')).toBe('W')
  })

  it('maps errors to a message and unknown ones to a generic one', () => {
    expect(getVaultErrorKey(VAULT_ERROR.LAST_VAULT)).toBe('vaults.errors.lastVault')
    expect(getVaultErrorKey('new-error')).toBe('vaults.errors.openFailed')
    expect(getVaultErrorKey(null)).toBeNull()
  })
})
