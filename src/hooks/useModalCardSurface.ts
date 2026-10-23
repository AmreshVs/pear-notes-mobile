import { useMemo } from 'react'
import { StyleSheet, type ViewStyle } from 'react-native'

import { useTheme } from '@/components/Themed'
import { hexWithAlpha } from '@/lib/backupUtils'

const CARD_SURFACE_ALPHA = 0.9

export function useModalCardSurface(): ViewStyle | null {
  const { colors } = useTheme()
  return useMemo(
    () =>
      StyleSheet.create({
        surface: {
          backgroundColor: hexWithAlpha(colors.surface, CARD_SURFACE_ALPHA),
        },
      }).surface,
    [colors.surface],
  )
}
