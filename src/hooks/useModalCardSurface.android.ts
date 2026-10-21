import { useMemo } from 'react'
import { StyleSheet, type ViewStyle } from 'react-native'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { UI_SIZE_28 } from '@/constants/commonStyles'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
}

export function useModalCardSurface(): ViewStyle | null {
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  return useMemo(
    () =>
      StyleSheet.create({
        surface: {
          backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
          borderRadius: UI_SIZE_28,
        },
      }).surface,
    [c.surfaceContainerHigh, c.surfaceVariant],
  )
}
