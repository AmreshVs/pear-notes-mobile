import {
  canAddSyncLeader,
  canRemoveSyncLeader,
} from '@pear-notes/core/store/slices/syncedDevicesSlice.js'

import { DEVICE_ACTION } from '@/constants/deviceActions'

import type { ContextMenuItem } from '../../modules/expo-context-menu'

export type DeviceActionFlags = {
  canRename: boolean
  canMakeIndexer: boolean
  canRemoveIndexer: boolean
  canRemove: boolean
  hasAny: boolean
}

export function getDeviceActionFlags(device: any, plan: any): DeviceActionFlags {
  const canRename = device?.isLocal === true
  const canMakeIndexer = canAddSyncLeader(device, plan)
  const canRemoveIndexer = canRemoveSyncLeader(device, plan)
  const canRemove = device?.isLocal !== true && device?.isIndexer !== true
  return {
    canRename,
    canMakeIndexer,
    canRemoveIndexer,
    canRemove,
    hasAny: canRename || canMakeIndexer || canRemoveIndexer || canRemove,
  }
}

export type DeviceMenuLabels = {
  rename: string
  makeIndexer: string
  removeIndexer: string
  remove: string
}

export function buildDeviceCardMenu(
  flags: DeviceActionFlags,
  labels: DeviceMenuLabels,
): ContextMenuItem[] {
  const items: ContextMenuItem[] = []

  if (flags.canRename) {
    items.push({ id: DEVICE_ACTION.rename, title: labels.rename, systemImage: 'pencil' })
  }

  if (flags.canMakeIndexer) {
    items.push({ id: DEVICE_ACTION.makeIndexer, title: labels.makeIndexer, systemImage: 'crown' })
  }

  if (flags.canRemoveIndexer) {
    items.push({
      id: DEVICE_ACTION.removeIndexer,
      title: labels.removeIndexer,
      systemImage: 'minus.circle',
    })
  }

  if (flags.canRemove) {
    items.push({
      id: DEVICE_ACTION.remove,
      title: labels.remove,
      systemImage: 'trash',
      destructive: true,
    })
  }

  return items
}
