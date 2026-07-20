import { LOCK_SWITCHER_HIDE_KEY } from '@pear-notes/core/constant.js'
import { getLockPrivacyPreference } from '@pear-notes/core/utils.js'
import { useEffect, useState } from 'react'
import { AppState, type AppStateStatus } from 'react-native'

export function useLockedContentShield(active: boolean) {
  const [enabled, setEnabled] = useState(true)
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState)

  useEffect(() => {
    let cancelled = false
    getLockPrivacyPreference(LOCK_SWITCHER_HIDE_KEY).then((value) => {
      if (!cancelled) setEnabled(value)
    })
    return () => {
      cancelled = true
    }
  }, [active])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState)
    return () => subscription.remove()
  }, [])

  const visible = active && enabled && appState !== 'active'

  return { visible }
}
