import { useCallback, useEffect, useState } from 'react'
import { DeviceEventEmitter } from 'react-native'

import {
  loadReminderPrefs,
  saveReminderPrefs,
} from '@pear-notes/core/store/services/upcomingTasks.js'

export type ReminderPrefs = { offsets: number[]; untimed: string }

export const REMINDERS_CHANGED_EVENT = 'pear-notes:reminders-changed'

export function useReminderPrefs(active: boolean) {
  const [prefs, setPrefs] = useState<ReminderPrefs | null>(null)

  useEffect(() => {
    if (!active) return
    let mounted = true
    loadReminderPrefs()
      .then((loaded: ReminderPrefs) => mounted && setPrefs(loaded))
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [active])

  const update = useCallback((next: ReminderPrefs) => {
    setPrefs(next)
    saveReminderPrefs(next)
      .then(() => DeviceEventEmitter.emit(REMINDERS_CHANGED_EVENT))
      .catch(() => {})
  }, [])

  const toggleOffset = useCallback(
    (offset: number) => {
      if (!prefs) return
      const offsets = prefs.offsets.includes(offset)
        ? prefs.offsets.filter((value) => value !== offset)
        : [...prefs.offsets, offset]
      if (offsets.length) update({ ...prefs, offsets })
    },
    [prefs, update],
  )

  const setUntimed = useCallback(
    (untimed: string) => {
      if (prefs) update({ ...prefs, untimed })
    },
    [prefs, update],
  )

  return { prefs, toggleOffset, setUntimed }
}
