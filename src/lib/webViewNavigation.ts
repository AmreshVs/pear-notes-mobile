import { Linking, Platform } from 'react-native'
import type WebView from 'react-native-webview'
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes'

const EDITOR_ORIGIN = 'https://localhost'
const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost']
const EXTERNALLY_OPENABLE_SCHEMES = ['https:', 'http:', 'mailto:']

export const EDITOR_ORIGIN_WHITELIST = ['*']

function originOf(url: string): string {
  try {
    const { protocol, host } = new URL(url)
    return `${protocol}//${host}`
  } catch {
    return ''
  }
}

function isEditorUrl(url: string): boolean {
  return originOf(url) === EDITOR_ORIGIN
}

export function isEditorMessageSource(url: string | undefined): boolean {
  return !url || isEditorUrl(url)
}

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
  const { url, isTopFrame } = request

  if (!url || url === 'about:blank') return true
  if (isEditorUrl(url)) return true
  if (url.startsWith('data:') || isLoopbackUrl(url)) return isTopFrame === false

  if (isExternallyOpenable(url)) {
    Linking.openURL(url).catch(() => {})
  }

  return false
}

let editorCacheCleared = false

export function clearEditorWebViewCacheOnce(webView: WebView | null): void {
  if (Platform.OS !== 'android' || editorCacheCleared || !webView) return
  editorCacheCleared = true
  webView.clearCache?.(true)
}
