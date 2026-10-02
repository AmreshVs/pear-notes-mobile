import { backendApi } from '@pear-notes/core/backend/api.js'

export type BackgroundSyncMode = 'off' | 'periodic' | 'always-on'

export const BACKGROUND_SYNC_MODE_KEY = 'backgroundSyncMode'
const DEFAULT_MODE: BackgroundSyncMode = 'off'

let cachedMode: BackgroundSyncMode = DEFAULT_MODE
let localChanges = 0

type ModeListener = (mode: BackgroundSyncMode) => void
const listeners = new Set<ModeListener>()

export function subscribeBackgroundSyncMode(listener: ModeListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function publishMode(mode: BackgroundSyncMode) {
  if (mode === cachedMode) return
  cachedMode = mode
  for (const listener of listeners) listener(mode)
}

export function getCachedBackgroundSyncMode(): BackgroundSyncMode {
  return cachedMode
}

export async function getBackgroundSyncMode(): Promise<BackgroundSyncMode> {
  const changesBeforeRead = localChanges
  try {
    const value = await backendApi.getPreference({ key: BACKGROUND_SYNC_MODE_KEY })
    if (localChanges !== changesBeforeRead) return cachedMode
    publishMode(
      value === 'off' || value === 'periodic' || value === 'always-on' ? value : DEFAULT_MODE,
    )
    return cachedMode
  } catch {
    return cachedMode
  }
}

export async function setBackgroundSyncMode(mode: BackgroundSyncMode): Promise<void> {
  localChanges += 1
  publishMode(mode)
  try {
    await backendApi.updatePreference({ key: BACKGROUND_SYNC_MODE_KEY, value: mode })
  } catch {}
}
