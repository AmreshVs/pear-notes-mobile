import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { useSelector } from 'react-redux'

import { getHasLinkedDevices } from '@pear-notes/core/store/slices/syncedDevicesSlice.js'

import {
  BackgroundSyncMode,
  getBackgroundSyncMode,
  getCachedBackgroundSyncMode,
  setBackgroundSyncMode,
  subscribeBackgroundSyncMode,
} from '@/lib/backgroundSync'
import { applyBackgroundSyncMode } from '@/lib/backgroundSyncTask'
import { hapticSelection } from '@/lib/haptics'

export const BACKGROUND_SYNC_MODE_LOCALE_KEY: Record<BackgroundSyncMode, string> = {
  off: 'off',
  periodic: 'periodic',
  'always-on': 'alwaysOn',
}

export function useBackgroundSync() {
  const hasLinkedDevices = useSelector(getHasLinkedDevices) as boolean
  const mode = useSyncExternalStore(subscribeBackgroundSyncMode, getCachedBackgroundSyncMode)

  useEffect(() => {
    getBackgroundSyncMode()
  }, [])

  useEffect(() => {
    if (hasLinkedDevices || mode === 'off') return
    setBackgroundSyncMode('off')
    applyBackgroundSyncMode('off')
  }, [hasLinkedDevices, mode])

  const commitMode = useCallback((next: BackgroundSyncMode) => {
    hapticSelection()
    setBackgroundSyncMode(next)
    applyBackgroundSyncMode(next)
  }, [])

  return { mode, hasLinkedDevices, commitMode }
}
