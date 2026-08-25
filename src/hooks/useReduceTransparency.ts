import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

export function useReduceTransparency(): boolean {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    let active = true
    AccessibilityInfo.isReduceTransparencyEnabled().then((value) => {
      if (active) setEnabled(value)
    })
    const subscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setEnabled)
    return () => {
      active = false
      subscription.remove()
    }
  }, [])

  return enabled
}
