import { memo, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

import { colorWithAlpha } from '@/utils/color'

const SOLID_STOP = '62%'

type EdgeFadeProps = {
  color: string
  placement?: 'top' | 'bottom'
}

export const EdgeFade = memo(function EdgeFade({ color, placement = 'top' }: EdgeFadeProps) {
  const gradientStyles = useMemo(() => {
    const direction = placement === 'bottom' ? 'to top' : 'to bottom'
    return StyleSheet.create({
      gradient: {
        experimental_backgroundImage: `linear-gradient(${direction}, ${colorWithAlpha(color, 1)} 0%, ${colorWithAlpha(color, 0.2)} ${SOLID_STOP}, ${colorWithAlpha(color, 0)} 100%)`,
      },
    })
  }, [color, placement])

  return <View pointerEvents="none" style={[styles.fill, gradientStyles.gradient]} />
})

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
  },
})
