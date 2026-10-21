const LIST_SEPARATOR = ', '

export function formatNameList(names: string[], locale: string): string {
  if (typeof Intl === 'undefined' || typeof Intl.ListFormat !== 'function') {
    return names.join(LIST_SEPARATOR)
  }
  return new Intl.ListFormat(locale, { type: 'conjunction' }).format(names)
}
