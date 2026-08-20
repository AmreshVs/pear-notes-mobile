import { backendApi } from '@pear-notes/core/backend/api.js'

export type AndroidColorTheme = 'pear' | 'material_you'

export const ANDROID_COLOR_THEME_KEY = 'androidColorTheme'

const DEFAULT_COLOR_THEME: AndroidColorTheme = 'pear'

let currentColorTheme: AndroidColorTheme = DEFAULT_COLOR_THEME
let loaded = false
let pendingLoad: Promise<AndroidColorTheme> | null = null

const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

function normalize(value: unknown): AndroidColorTheme {
  return value === 'material_you' ? 'material_you' : DEFAULT_COLOR_THEME
}

export function getAndroidColorTheme(): AndroidColorTheme {
  return currentColorTheme
}

export function subscribeAndroidColorTheme(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

async function readStoredColorTheme(): Promise<AndroidColorTheme> {
  try {
    const value = await backendApi.getPreference({ key: ANDROID_COLOR_THEME_KEY })
    currentColorTheme = normalize(value)
  } catch {
    currentColorTheme = DEFAULT_COLOR_THEME
  }
  loaded = true
  pendingLoad = null
  notify()
  return currentColorTheme
}

export function loadAndroidColorTheme(): Promise<AndroidColorTheme> {
  if (loaded) return Promise.resolve(currentColorTheme)
  if (!pendingLoad) pendingLoad = readStoredColorTheme()
  return pendingLoad
}

export async function setAndroidColorTheme(theme: AndroidColorTheme): Promise<void> {
  currentColorTheme = normalize(theme)
  loaded = true
  pendingLoad = null
  notify()
  try {
    await backendApi.updatePreference({
      key: ANDROID_COLOR_THEME_KEY,
      value: currentColorTheme,
    })
  } catch {}
}
