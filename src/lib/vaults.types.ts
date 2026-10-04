export type Vault = {
  id: string
  name: string
  addedAt: number
  current: boolean
}

export type VaultAction = 'create' | 'switch' | 'rename' | 'remove' | 'move'
