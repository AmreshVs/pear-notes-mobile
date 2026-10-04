import type { TFunction } from 'i18next'

import { formatBytes } from '@pear-notes/core/utils.js'

import type { RemovalDetails, RemovalDevice, RemovalItem } from '@/lib/removal.types'

const REMOVE_ALL_TITLE_KEYS: Record<RemovalDevice, string> = {
  iphone: 'storage.removal.allTitleIphone',
  phone: 'storage.removal.allTitlePhone',
  computer: 'storage.removal.allTitleComputer',
}

const CLEAR_VAULT_TITLE_KEYS: Record<RemovalDevice, string> = {
  iphone: 'storage.removal.vaultTitleIphone',
  phone: 'storage.removal.vaultTitlePhone',
  computer: 'storage.removal.vaultTitleComputer',
}

const SHARED_KEPT = (t: TFunction): RemovalItem[] => [
  { key: 'devices', icon: 'devices', label: t('storage.removal.otherDevices') },
  { key: 'backups', icon: 'backups', label: t('storage.removal.backups') },
]

type RemoveAllInput = {
  device: RemovalDevice
  vaultNames: string[]
  vaultBytes: number
  aiBytes: number
  showAi: boolean
  dataBytes: number
}

export function buildRemoveAllDetails(t: TFunction, input: RemoveAllInput): RemovalDetails {
  const removed: RemovalItem[] = [
    {
      key: 'vaults',
      icon: 'vaults',
      label: t('storage.removal.vaults', {
        count: input.vaultNames.length,
        names: input.vaultNames.join(', '),
      }),
      value: formatBytes(input.vaultBytes),
    },
  ]
  if (input.showAi) {
    removed.push({
      key: 'ai',
      icon: 'ai',
      label: t('settings.onDeviceAi.storageRow'),
      value: formatBytes(input.aiBytes),
    })
  }
  removed.push({
    key: 'data',
    icon: 'data',
    label: t('storage.removal.settingsCache'),
    value: formatBytes(input.dataBytes),
  })
  return {
    title: t(REMOVE_ALL_TITLE_KEYS[input.device]),
    confirmLabel: t('storage.removal.allBtn'),
    removed,
    kept: SHARED_KEPT(t),
    note: t('storage.removal.cantUndoFresh'),
  }
}

type ClearVaultInput = {
  device: RemovalDevice
  vaultName: string
  notes: number
  folders: number
  mediaBytes: number
  otherVaultNames: string[]
}

export function buildClearVaultDetails(t: TFunction, input: ClearVaultInput): RemovalDetails {
  const removed: RemovalItem[] = [
    {
      key: 'notes',
      icon: 'notes',
      label: t('storage.removal.notesAndFolders', { notes: input.notes, folders: input.folders }),
    },
    {
      key: 'media',
      icon: 'media',
      label: t('storage.removal.mediaFiles'),
      value: formatBytes(input.mediaBytes),
    },
  ]
  if (input.otherVaultNames.length === 0) {
    return {
      title: t(REMOVE_ALL_TITLE_KEYS[input.device]),
      confirmLabel: t('storage.removal.allBtn'),
      removed,
      kept: SHARED_KEPT(t),
      note: t('storage.removal.cantUndoFresh'),
    }
  }
  return {
    title: t(CLEAR_VAULT_TITLE_KEYS[input.device], { name: input.vaultName }),
    confirmLabel: t('storage.clearVaultBtn'),
    removed,
    kept: [
      {
        key: 'devices',
        icon: 'devices',
        label: t('storage.removal.vaultOtherDevices', { name: input.vaultName }),
      },
      {
        key: 'vaults',
        icon: 'vaults',
        label: input.otherVaultNames.join(', '),
      },
    ],
    note: t('storage.removal.cantUndo'),
  }
}
