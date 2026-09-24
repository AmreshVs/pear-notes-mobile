import { useEffect, useSyncExternalStore } from 'react'

import {
  getShowAiTools,
  loadShowAiTools,
  subscribeShowAiTools,
} from '@/lib/localAi/aiToolsPreference'

export function useShowAiTools(): boolean {
  const showAiTools = useSyncExternalStore(subscribeShowAiTools, getShowAiTools)

  useEffect(() => {
    loadShowAiTools()
  }, [])

  return showAiTools
}
