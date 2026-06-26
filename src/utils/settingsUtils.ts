import { ActionSheetIOS } from 'react-native'

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
  onSelect: (value: string) => void,
  cancelLabel: string,
) {
  const labels = [...options.map((o) => o.label), cancelLabel]
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
