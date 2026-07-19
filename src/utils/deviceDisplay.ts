const RAW_KEY_REGEX = /^[0-9a-f]{32,}$/i

export function isRawDeviceKey(value?: string): boolean {
  return typeof value === 'string' && RAW_KEY_REGEX.test(value)
}

export function getDeviceShortKey(key?: string): string {
  if (!key) return ''
  if (key.length <= 12) return key
  return `${key.slice(0, 6)}…${key.slice(-5)}`
}

export function getDeviceDisplayName(device?: { title?: string; key?: string }): string {
  if (!device) return ''
  const { title, key } = device
  if (title && !isRawDeviceKey(title)) return title
  return getDeviceShortKey(key) || 'Unknown'
}
