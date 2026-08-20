import { useEffect, useSyncExternalStore } from 'react'

import {
  AndroidColorTheme,
  getAndroidColorTheme,
  loadAndroidColorTheme,
  subscribeAndroidColorTheme,
} from '@/lib/androidColorTheme'

export function useAndroidColorTheme(): AndroidColorTheme {
  const colorTheme = useSyncExternalStore(subscribeAndroidColorTheme, getAndroidColorTheme)

  useEffect(() => {
    loadAndroidColorTheme()
  }, [])

  return colorTheme
}
