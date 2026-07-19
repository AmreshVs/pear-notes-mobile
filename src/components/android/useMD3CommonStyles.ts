import { useMemo } from 'react'
import { StyleSheet } from 'react-native'

import { useMD3Theme } from './useMD3Theme'

import { FontFamily, FontSize, FontWeight, LetterSpacing, Space } from '@/constants/commonStyles'

export function useMD3CommonStyles() {
  const md3 = useMD3Theme()
  const c = md3.colors

  return useMemo(
    () =>
      StyleSheet.create({
        settingsSectionCap: {
          fontSize: FontSize.caption,
          fontWeight: FontWeight.heavy,
          fontFamily: FontFamily.bold,
          letterSpacing: LetterSpacing.wide,
          textTransform: 'uppercase',
          color: c.onSurfaceVariant,
          marginBottom: Space.sm,
        },
        settingsSectionCapSpaced: {
          fontSize: FontSize.caption,
          fontWeight: FontWeight.heavy,
          fontFamily: FontFamily.bold,
          letterSpacing: LetterSpacing.wide,
          textTransform: 'uppercase',
          color: c.onSurfaceVariant,
          marginBottom: Space.sm,
          marginTop: Space.xl,
        },
      }),
    [c.onSurfaceVariant],
  )
}
