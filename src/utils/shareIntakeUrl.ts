const SHARE_INTAKE_URL_PATTERN = /^(?:[a-z][a-z0-9+.-]*:\/\/)?\/?share-intake(?:[/?#]|$)/i

export const isShareIntakeUrl = (url: string | null | undefined): boolean =>
  typeof url === 'string' && SHARE_INTAKE_URL_PATTERN.test(url)
