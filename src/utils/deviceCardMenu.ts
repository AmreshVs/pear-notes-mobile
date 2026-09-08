import { DEVICE_ACTION } from '@/constants/deviceActions'
import { canPromoteDevice } from '@/utils/indexerUtils'

import type { ContextMenuItem } from '../../modules/expo-context-menu'

export type DeviceActionFlags = {
  canRename: boolean
  canMakeIndexer: boolean
  canRemove: boolean
  hasAny: boolean
}

export function getDeviceActionFlags(device: any, indexerDevice?: any): DeviceActionFlags {
  const canRename = device?.isLocal === true
  const canMakeIndexer = canPromoteDevice(device, indexerDevice)
  const canRemove = device?.isLocal !== true && device?.isIndexer !== true
  return {
    canRename,
    canMakeIndexer,
    canRemove,
    hasAny: canRename || canMakeIndexer || canRemove,
  }
}

export type DeviceMenuLabels = {
  rename: string
  makeIndexer: string
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
