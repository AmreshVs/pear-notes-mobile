import { useMemo } from 'react'
import { StyleSheet } from 'react-native'

import { FontFamily, FontSize, FontWeight, LetterSpacing, Space } from '@/constants/commonStyles'

import { useMD3Theme } from './useMD3Theme'

export function useMD3CommonStyles() {
  const md3 = useMD3Theme()
  const c = md3.colors

  return useMemo(
    () =>
      StyleSheet.create({
        settingsSectionCamelCase: {
          fontSize: FontSize.body,
          fontWeight: FontWeight.heavy,
          fontFamily: FontFamily.bold,
          letterSpacing: 0.5,
          color: c.onSurface,
          marginBottom: Space.sm,
        },
        settingsSectionCap: {
          fontSize: FontSize.caption,
          fontWeight: FontWeight.heavy,
          fontFamily: FontFamily.bold,
          letterSpacing: LetterSpacing.wide,
          color: c.onSurfaceVariant,
          marginBottom: Space.sm,
        },
        settingsSectionCapSpaced: {
          fontSize: FontSize.caption,
          fontWeight: FontWeight.heavy,
          fontFamily: FontFamily.bold,
          letterSpacing: LetterSpacing.wide,
          color: c.onSurfaceVariant,
          marginBottom: Space.sm,
          marginTop: Space.xl,
        },
      }),
    [c.onSurfaceVariant],
  )
}
