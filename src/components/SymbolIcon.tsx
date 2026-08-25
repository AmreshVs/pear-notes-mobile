import { useMemo } from 'react'
import { type ColorValue, type StyleProp, View, type ViewStyle } from 'react-native'
import { SymbolView } from 'expo-symbols'

import type { IconName, IconWeight } from '@/components/SymbolIcon.types'

export type { IconName, IconWeight }

type SymbolIconProps = {
  name: IconName
  size: number
  color?: ColorValue
  weight?: IconWeight
  style?: StyleProp<ViewStyle>
}

export function SymbolIcon({ name, size, color, weight = 'regular', style }: SymbolIconProps) {
  const fallbackStyle = useMemo(() => ({ width: size, height: size }), [size])

  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color}
      weight={weight}
      style={style}
      fallback={<View style={fallbackStyle} />}
    />
  )
}
