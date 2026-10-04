export type RemovalIcon = 'vaults' | 'ai' | 'data' | 'notes' | 'media' | 'devices' | 'backups'

export type RemovalItem = {
  key: string
  icon: RemovalIcon
  label: string
  value?: string
}

export type RemovalDevice = 'iphone' | 'phone' | 'computer'

export type RemovalDetails = {
  title: string
  confirmLabel: string
  removed: RemovalItem[]
  kept: RemovalItem[]
  note: string
}
