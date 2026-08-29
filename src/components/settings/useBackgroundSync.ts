import { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

import { getHasLinkedDevices } from '@pear-notes/core/store/slices/syncedDevicesSlice.js'

import {
  BackgroundSyncMode,
  getBackgroundSyncMode,
  setBackgroundSyncMode,
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
  const [mode, setMode] = useState<BackgroundSyncMode>('off')

  useEffect(() => {
    let active = true
    getBackgroundSyncMode().then((value) => {
      if (active) setMode(value)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (hasLinkedDevices || mode === 'off') return
    setMode('off')
    setBackgroundSyncMode('off')
    applyBackgroundSyncMode('off')
  }, [hasLinkedDevices, mode])

  const commitMode = useCallback((next: BackgroundSyncMode) => {
    hapticSelection()
    setMode(next)
    setBackgroundSyncMode(next)
    applyBackgroundSyncMode(next)
  }, [])

  return { mode, hasLinkedDevices, commitMode }
}
