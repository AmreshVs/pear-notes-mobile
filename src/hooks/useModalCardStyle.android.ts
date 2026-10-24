import { useMemo } from 'react'
import { StyleSheet, type ViewStyle } from 'react-native'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { commonStyles, UI_SIZE_28 } from '@/constants/commonStyles'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
}

export function useModalCardStyle(): ViewStyle {
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  return useMemo(
    () =>
      StyleSheet.flatten([
        commonStyles.modalCard,
        { backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant, borderRadius: UI_SIZE_28 },
      ]),
    [c.surfaceContainerHigh, c.surfaceVariant],
  )
}
