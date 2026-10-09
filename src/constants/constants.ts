export const LIST_INITIAL_RENDER_COUNT = 10
export const LIST_BATCH_RENDER_COUNT = 6
export const LIST_WINDOW_SIZE = 7
export const LIST_BATCHING_PERIOD_MS = 60

export const ANDROID_RIPPLE_ENABLED = true

export const MOCK_LOCAL_AI = __DEV__ && false

export const ATTACHMENT_THUMBNAIL_CACHE_DIR = 'attachment-thumb'

export const MIN_TITLE_COLLAPSE_DISTANCE = 140

export const TITLE_COLLAPSE_BUFFER = 64
export const TITLE_COLLAPSE_HYSTERESIS = 32
export const SCROLL_EVENT_THROTTLE = 16

export const ANDROID_APP_BAR_HEIGHT = 44

export const APP_THEME_SETTINGS = {
  system: 'system',
  light: 'light',
  dark: 'dark',
} as const

export type AppThemeSetting = (typeof APP_THEME_SETTINGS)[keyof typeof APP_THEME_SETTINGS]

export const APP_UPDATE_STORE_HOSTS: Record<string, string> = {
  ios: 'apps.apple.com',
  android: 'play.google.com',
}

export const BACKUP_NUDGE_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000

export const BACKUP_NUDGE_GRACE_MS = 0
