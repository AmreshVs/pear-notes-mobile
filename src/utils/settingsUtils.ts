import { ActionSheetIOS, Platform } from 'react-native'

import type { DeviceAuthMethod } from '@/lib/deviceAuth'

const LOCK_METHOD_LABEL_KEYS_IOS: Record<DeviceAuthMethod, string> = {
  face: 'settings.privacy.methods.faceIos',
  fingerprint: 'settings.privacy.methods.touchId',
  iris: 'settings.privacy.methods.iris',
  passcode: 'settings.privacy.methods.passcodeIos',
  none: '',
}

const LOCK_METHOD_LABEL_KEYS_ANDROID: Record<DeviceAuthMethod, string> = {
  face: 'settings.privacy.methods.faceAndroid',
  fingerprint: 'settings.privacy.methods.fingerprintAndroid',
  iris: 'settings.privacy.methods.iris',
  passcode: 'settings.privacy.methods.screenLock',
  none: '',
}

export function getLockMethodLabelKey(method: DeviceAuthMethod): string {
  const keys =
    Platform.OS === 'android' ? LOCK_METHOD_LABEL_KEYS_ANDROID : LOCK_METHOD_LABEL_KEYS_IOS
  return keys[method]
}

export function getSortOptions(t: (key: string) => string) {
  return [
    { label: t('settings.general.sortOptions.updatedAt'), value: 'updatedAt' },
    { label: t('settings.general.sortOptions.createdAt'), value: 'createdAt' },
    { label: t('settings.general.sortOptions.title'), value: 'title' },
  ]
}

export function getFontOptions(t: (key: string) => string) {
  return [
    { label: t('settings.general.fontOptions.Inter'), value: 'Inter' },
    { label: t('settings.general.fontOptions.Outfit'), value: 'Outfit' },
    { label: t('settings.general.fontOptions.Lora'), value: 'Lora' },
    { label: t('settings.general.fontOptions.Newsreader'), value: 'Newsreader' },
    { label: t('settings.general.fontOptions.IBM Plex Mono'), value: 'IBM Plex Mono' },
    { label: t('settings.general.fontOptions.System'), value: 'System' },
    { label: t('settings.general.fontOptions.Serif'), value: 'Serif' },
    { label: t('settings.general.fontOptions.Mono'), value: 'Mono' },
  ]
}

export function showPicker(
  title: string,
  options: { label: string; value: string }[],
  selectedValue: string,
  onSelect: (value: string) => void,
  cancelLabel: string,
) {
  const labels = [
    ...options.map((o) => (o.value === selectedValue ? `✓  ${o.label}` : o.label)),
    cancelLabel,
  ]
  ActionSheetIOS.showActionSheetWithOptions(
    { options: labels, cancelButtonIndex: labels.length - 1, title },
    (index) => {
      if (index < options.length) onSelect(options[index].value)
    },
  )
}

export function getPlatformNames(t: (key: string) => string): Record<string, string> {
  return {
    darwin: t('sync.platforms.macOS'),
    win32: t('sync.platforms.Windows'),
    linux: t('sync.platforms.Linux'),
    android: t('sync.platforms.Android'),
    ios: t('sync.platforms.iOS'),
  }
}
