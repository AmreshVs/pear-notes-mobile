export const LIST_INITIAL_RENDER_COUNT = 10
export const LIST_BATCH_RENDER_COUNT = 6
export const LIST_WINDOW_SIZE = 7
export const LIST_BATCHING_PERIOD_MS = 60

export const ANDROID_RIPPLE_ENABLED = true

export const PDF_THUMBNAIL_CACHE_DIR = 'pdf-thumb'
export const PDF_THUMBNAIL_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000

// Minimum scroll distance before the large title collapses into the iOS nav bar.
// The title block is often shorter than this, so without a floor the centre
// title snaps in almost immediately.
export const MIN_TITLE_COLLAPSE_DISTANCE = 120

export const TITLE_COLLAPSE_BUFFER = 64
export const TITLE_COLLAPSE_HYSTERESIS = 32

export const ANDROID_APP_BAR_HEIGHT = 44
