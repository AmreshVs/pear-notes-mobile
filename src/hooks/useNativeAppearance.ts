import { useEffect } from 'react'
import { Appearance } from 'react-native'

import { APP_THEME_SETTINGS, type AppThemeSetting } from '@/constants/constants'

export function useNativeAppearance(themeSetting: AppThemeSetting): void {
  useEffect(() => {
    Appearance.setColorScheme(
      themeSetting === APP_THEME_SETTINGS.system ? 'unspecified' : themeSetting,
    )
  }, [themeSetting])
}
