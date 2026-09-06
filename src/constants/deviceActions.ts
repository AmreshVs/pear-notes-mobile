export const DEVICE_ACTION = {
  rename: 'rename',
  makeIndexer: 'makeIndexer',
  remove: 'remove',
} as const

export type DeviceActionId = (typeof DEVICE_ACTION)[keyof typeof DEVICE_ACTION]
