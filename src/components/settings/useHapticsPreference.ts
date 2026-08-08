import { useCallback, useEffect, useState } from 'react'

import {
  hapticSelection,
  isHapticsEnabled,
  loadHapticsPreference,
  setHapticsEnabled,
} from '@/lib/haptics'

export function useHapticsPreference() {
  const [hapticsEnabled, setEnabled] = useState(isHapticsEnabled())

  useEffect(() => {
    let active = true
    loadHapticsPreference().then((value) => {
      if (active) setEnabled(value)
    })
    return () => {
      active = false
    }
  }, [])

  const toggleHaptics = useCallback(() => {
    const next = !hapticsEnabled
    setEnabled(next)
    setHapticsEnabled(next)
    if (next) hapticSelection()
  }, [hapticsEnabled])

  return { hapticsEnabled, toggleHaptics }
}
