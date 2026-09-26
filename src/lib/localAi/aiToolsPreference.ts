import { backendApi } from '@pear-notes/core/backend/api.js'

const SHOW_AI_TOOLS_KEY = 'showAiTools'
const SHOW_AI_TOOLS_IN_LOCKED_KEY = 'showAiToolsInLockedNotes'

function createBooleanPreference(key: string, defaultValue: boolean) {
  let value = defaultValue
  let loaded = false
  let pendingLoad: Promise<boolean> | null = null
  const listeners = new Set<() => void>()

  const notify = () => {
    for (const listener of listeners) listener()
  }

  const read = async (): Promise<boolean> => {
    try {
      const stored = await backendApi.getPreference({ key })
      value = stored === 'true' ? true : stored === 'false' ? false : defaultValue
      loaded = true
      notify()
    } catch {}
    pendingLoad = null
    return value
  }

  return {
    get: (): boolean => value,
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    load: (): Promise<boolean> => {
      if (loaded) return Promise.resolve(value)
      if (!pendingLoad) pendingLoad = read()
      return pendingLoad
    },
    set: async (enabled: boolean): Promise<void> => {
      value = enabled
      loaded = true
      pendingLoad = null
      notify()
      try {
        await backendApi.updatePreference({ key, value: enabled ? 'true' : 'false' })
      } catch {}
    },
  }
}

export const showAiToolsPreference = createBooleanPreference(SHOW_AI_TOOLS_KEY, true)
export const showAiToolsInLockedPreference = createBooleanPreference(
  SHOW_AI_TOOLS_IN_LOCKED_KEY,
  false,
)

export const setShowAiTools = showAiToolsPreference.set
export const setShowAiToolsInLocked = showAiToolsInLockedPreference.set
