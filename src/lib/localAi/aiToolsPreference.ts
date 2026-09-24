import { backendApi } from '@pear-notes/core/backend/api.js'

export const SHOW_AI_TOOLS_KEY = 'showAiTools'

let showAiTools = true
let loaded = false
let pendingLoad: Promise<boolean> | null = null

const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

export function getShowAiTools(): boolean {
  return showAiTools
}

export function subscribeShowAiTools(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

async function readStoredShowAiTools(): Promise<boolean> {
  try {
    const value = await backendApi.getPreference({ key: SHOW_AI_TOOLS_KEY })
    showAiTools = value !== 'false'
    loaded = true
    notify()
  } catch {}
  pendingLoad = null
  return showAiTools
}

export function loadShowAiTools(): Promise<boolean> {
  if (loaded) return Promise.resolve(showAiTools)
  if (!pendingLoad) pendingLoad = readStoredShowAiTools()
  return pendingLoad
}

export async function setShowAiTools(enabled: boolean): Promise<void> {
  showAiTools = enabled
  loaded = true
  pendingLoad = null
  notify()
  try {
    await backendApi.updatePreference({
      key: SHOW_AI_TOOLS_KEY,
      value: enabled ? 'true' : 'false',
    })
  } catch {}
}
