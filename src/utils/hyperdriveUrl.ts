import { HYPERDRIVE_URL_PREFIX } from '@pear-notes/core/constant.js'

export function resolveHyperdriveUrl(
  url: string | null | undefined,
  serverAddress: string | null | undefined,
): string | null | undefined {
  if (!url) return undefined
  if (!serverAddress) return url.includes(HYPERDRIVE_URL_PREFIX) ? null : url
  return url.replace(HYPERDRIVE_URL_PREFIX, serverAddress.replace(/\/$/, ''))
}
