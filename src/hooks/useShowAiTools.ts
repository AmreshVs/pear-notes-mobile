import { useEffect, useSyncExternalStore } from 'react'

import {
  showAiToolsInLockedPreference,
  showAiToolsPreference,
} from '@/lib/localAi/aiToolsPreference'

type BooleanPreference = typeof showAiToolsPreference

function useBooleanPreference(preference: BooleanPreference): boolean {
  const value = useSyncExternalStore(preference.subscribe, preference.get)

  useEffect(() => {
    preference.load()
  }, [preference])

  return value
}

export function useShowAiTools(): boolean {
  return useBooleanPreference(showAiToolsPreference)
}

export function useShowAiToolsInLocked(): boolean {
  return useBooleanPreference(showAiToolsInLockedPreference)
}
