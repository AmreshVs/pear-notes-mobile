import { useMemo } from 'react'
import { StyleSheet, type ViewStyle } from 'react-native'

import { useTheme } from '@/components/Themed'
import { commonStyles } from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

const CARD_SURFACE_ALPHA = 0.9

export function useModalCardStyle(): ViewStyle {
  const { colors } = useTheme()
  return useMemo(
    () =>
      StyleSheet.flatten([
        commonStyles.modalCard,
        { backgroundColor: hexWithAlpha(colors.surface, CARD_SURFACE_ALPHA) },
      ]),
    [colors.surface],
  )
}
