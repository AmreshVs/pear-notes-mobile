import { Linking } from 'react-native'
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes'

const EDITOR_ORIGIN = 'https://localhost'
const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost']
const EXTERNALLY_OPENABLE_SCHEMES = ['https:', 'http:', 'mailto:']

export const EDITOR_ORIGIN_WHITELIST = [EDITOR_ORIGIN]

function isLoopbackUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return LOOPBACK_HOSTS.includes(hostname)
  } catch {
    return false
  }
}

function isExternallyOpenable(url: string): boolean {
  try {
    return EXTERNALLY_OPENABLE_SCHEMES.includes(new URL(url).protocol)
  } catch {
    return false
  }
}

export function shouldStartEditorLoad(request: ShouldStartLoadRequest): boolean {
  const { url } = request

  if (!url || url === 'about:blank' || url.startsWith('data:')) return true
  if (url.startsWith(EDITOR_ORIGIN)) return true
  if (isLoopbackUrl(url)) return true

  if (isExternallyOpenable(url)) {
    Linking.openURL(url).catch(() => {})
  }

  return false
}
