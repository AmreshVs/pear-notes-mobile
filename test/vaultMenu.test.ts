import { buildVaultMenu } from '../src/utils/vaultMenu'

const labels = { open: 'Open', rename: 'Rename', remove: 'Remove' }

describe('buildVaultMenu', () => {
  it('offers to open a vault that is not open', () => {
    const items = buildVaultMenu({ current: false } as any, true, labels)
    expect(items.map((item) => item.title)).toEqual(['Open', 'Rename', 'Remove'])
  })

  it('does not offer to open the open vault', () => {
    expect(buildVaultMenu({ current: true } as any, true, labels).map((i) => i.title)).toEqual([
      'Rename',
      'Remove',
    ])
  })

  it('hides remove when the vault cannot be removed, and marks it destructive otherwise', () => {
    expect(buildVaultMenu({ current: true } as any, false, labels)).toHaveLength(1)
    expect(buildVaultMenu({ current: true } as any, true, labels)[1]).toMatchObject({
      destructive: true,
    })
  })
})
