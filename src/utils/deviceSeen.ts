import type { TFunction } from 'i18next'

const DAY_MS = 24 * 60 * 60 * 1000

export function outdatedDeviceMeta(
  device: { appVersion?: string; lastSeenAt?: number },
  t: TFunction,
  now = Date.now(),
): string {
  const parts: string[] = []
  if (device.appVersion) {
    parts.push(t('settings.privacy.outdatedDeviceVersion', { version: device.appVersion }))
  }
  if (device.lastSeenAt) {
    const days = Math.max(0, Math.floor((now - device.lastSeenAt) / DAY_MS))
    parts.push(
      days === 0
        ? t('settings.privacy.outdatedDeviceSeenToday')
        : t('settings.privacy.outdatedDeviceSeen', { count: days }),
    )
  }
  return parts.join(' · ')
}
