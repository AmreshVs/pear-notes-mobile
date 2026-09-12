import { memo, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import MaskedView from '@react-native-masked-view/masked-view'
import { BlurView } from 'expo-blur'

import { useTheme } from '@/components/Themed'
import { useReduceTransparency } from '@/hooks/useReduceTransparency'
import { colorWithAlpha } from '@/utils/color'

const SOLID_STOP = '62%'
const BLUR_SOLID_STOP = '45%'
const BLUR_INTENSITY = 20

type EdgeFadeProps = {
  color: string
  placement?: 'top' | 'bottom'
}

export const EdgeFade = memo(function EdgeFade({ color, placement = 'top' }: EdgeFadeProps) {
  const theme = useTheme()
  const reduceTransparency = useReduceTransparency()
  const showBlur = !reduceTransparency

  const gradientStyles = useMemo(() => {
    const direction = placement === 'bottom' ? 'to top' : 'to bottom'
    const tintStart = showBlur ? 0.85 : 1
    return StyleSheet.create({
      tint: {
        experimental_backgroundImage: `linear-gradient(${direction}, ${colorWithAlpha(color, tintStart)} 0%, ${colorWithAlpha(color, 0.2)} ${SOLID_STOP}, ${colorWithAlpha(color, 0)} 100%)`,
      },
      mask: {
        experimental_backgroundImage: `linear-gradient(${direction}, ${colorWithAlpha(color, 1)} 0%, ${colorWithAlpha(color, 1)} ${BLUR_SOLID_STOP}, ${colorWithAlpha(color, 0)} 100%)`,
      },
    })
  }, [color, placement, showBlur])

  const maskElement = useMemo(
    () => <View style={[styles.fill, gradientStyles.mask]} />,
    [gradientStyles.mask],
  )

  return (
    <View pointerEvents="none" style={styles.fill}>
      {showBlur && (
        <MaskedView style={styles.fill} maskElement={maskElement}>
          <BlurView
            intensity={BLUR_INTENSITY}
            tint={theme.isDark ? 'dark' : 'light'}
            style={styles.fill}
          />
        </MaskedView>
      )}
      <View style={[styles.fill, gradientStyles.tint]} />
    </View>
  )
})

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
  },
})
