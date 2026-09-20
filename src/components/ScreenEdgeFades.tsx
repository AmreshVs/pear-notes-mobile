import { memo, useMemo } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { EdgeFade } from '@/components/EdgeFade'
import { useTheme } from '@/components/Themed'
import {
  SHORT_WINDOW_MAX_HEIGHT,
  UI_SIZE_20,
  UI_SIZE_44,
  UI_SIZE_50,
  UI_SIZE_56,
} from '@/constants/commonStyles'

type ScreenEdgeFadesVariant = 'screen' | 'sheet'

type ScreenEdgeFadesProps = {
  variant?: ScreenEdgeFadesVariant
}

const TOP_BAR_HEIGHT: Record<ScreenEdgeFadesVariant, number> = {
  screen: UI_SIZE_44,
  sheet: UI_SIZE_56,
}

const BOTTOM_BAR_HEIGHT: Record<ScreenEdgeFadesVariant, number> = {
  screen: UI_SIZE_50,
  sheet: 0,
}

const USES_TOP_INSET: Record<ScreenEdgeFadesVariant, boolean> = {
  screen: true,
  sheet: false,
}

export const ScreenEdgeFades = memo(function ScreenEdgeFades({
  variant = 'screen',
}: ScreenEdgeFadesProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()
  const fadeColor = variant === 'sheet' ? colors.backgroundElevated : colors.background
  const isShortWindow = windowHeight <= SHORT_WINDOW_MAX_HEIGHT

  const fadeStyles = useMemo(() => {
    const topInset = USES_TOP_INSET[variant] ? insets.top : 0
    const barAllowance = isShortWindow ? 0 : UI_SIZE_20
    return StyleSheet.create({
      top: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: topInset + (isShortWindow ? 0 : TOP_BAR_HEIGHT[variant]) + barAllowance,
      },
      bottom: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: insets.bottom + (isShortWindow ? 0 : BOTTOM_BAR_HEIGHT[variant]) + barAllowance,
      },
    })
  }, [insets.top, insets.bottom, variant, isShortWindow])

  const topHeight = StyleSheet.flatten(fadeStyles.top).height
  const bottomHeight = StyleSheet.flatten(fadeStyles.bottom).height

  return (
    <>
      {!!topHeight && (
        <View style={fadeStyles.top} pointerEvents="none">
          <EdgeFade color={fadeColor} />
        </View>
      )}
      {!!bottomHeight && (
        <View style={fadeStyles.bottom} pointerEvents="none">
          <EdgeFade color={fadeColor} placement="bottom" />
        </View>
      )}
    </>
  )
})
